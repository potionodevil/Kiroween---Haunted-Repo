import "server-only";
import {
  HEAD,
  collectGhosts,
  scanPatch,
  scanText,
  score,
  sortFindings,
  type Finding,
  type RepoRef,
  type ScanResult,
  type SecretHit,
} from "@haunted/core";
import { GitHubError, fetchCommitShas, fetchDiffs, fetchFiles, fetchRepo, fetchTree, type RepoTree, type SourceFile } from "@haunted/github";
import { findVampires, parseLockfiles } from "./osv";
import { seal } from "./seal";
import { runRepoScanners } from "./repo-scanners";

export const DEADLINE_MS = 55_000;

function readDecoys(files: SourceFile[]): Set<string> {
  const f = files.find((x) => x.path === ".haunted/decoys.json");
  if (!f) return new Set();
  try {
    const j = JSON.parse(f.content) as { decoys?: { sha256?: unknown }[] };
    return new Set((j.decoys ?? []).map((d) => d.sha256).filter((h): h is string => typeof h === "string" && /^[0-9a-f]{64}$/.test(h)));
  } catch {
    return new Set();
  }
}

function uniqueByPath<T extends { path: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)));
}

export async function scanRepo({ owner, repo }: RepoRef): Promise<ScanResult> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEADLINE_MS);
  const signal = ctrl.signal;
  const notes: string[] = [];

  try {
    const info = await fetchRepo(owner, repo, signal);
    if (info.private) throw new GitHubError(404, "We can only see public repos");
    const branch = info.defaultBranch;

    const [shas, tree] = await Promise.all([
      fetchCommitShas(owner, repo, branch, signal),
      fetchTree(owner, repo, branch, signal).catch((e): RepoTree | null => {
        if (e instanceof GitHubError && e.status === 429) throw e;
        notes.push("Could not read the file tree: current files were skipped.");
        return null;
      }),
    ]);
    if (tree?.truncated) notes.push("The repo is very large: GitHub returned only part of the file tree.");

    const textEntries = tree ? uniqueByPath([...tree.secretFiles, ...tree.meta, ...tree.workflows]) : [];
    const [diffs, codeFiles, textFiles, lockFiles] = await Promise.all([
      fetchDiffs(owner, repo, shas, signal),
      tree ? fetchFiles(owner, repo, branch, tree.code, signal) : Promise.resolve<SourceFile[]>([]),
      tree ? fetchFiles(owner, repo, branch, textEntries, signal) : Promise.resolve<SourceFile[]>([]),
      tree ? fetchFiles(owner, repo, branch, tree.lockfiles, signal) : Promise.resolve<SourceFile[]>([]),
    ]);

    // Ghosts: history + current files. Raw values stay inside the scanner; GitHub tokens get a sealed handle.
    const historyHits: SecretHit[] = [];
    for (const d of diffs) {
      for (const f of d.files) {
        if (f.patch) historyHits.push(...scanPatch(f.patch, { file: f.filename, commit: d.sha.slice(0, 7), date: d.date, seal }));
      }
    }
    const headHits: SecretHit[] = [];
    for (const f of [...codeFiles, ...textFiles]) {
      headHits.push(...scanText(f.content, { file: f.path, commit: HEAD, date: null, seal }));
    }

    // Decoy ghosts (feature 30) registered by hash in .haunted/decoys.json are friendly: skip them.
    const decoys = readDecoys(textFiles);
    if (decoys.size > 0) {
      const before = historyHits.length + headHits.length;
      const keep = (h: SecretHit) => !decoys.has(h.hash);
      historyHits.splice(0, historyHits.length, ...historyHits.filter(keep));
      headHits.splice(0, headHits.length, ...headHits.filter(keep));
      if (before > historyHits.length + headHits.length) notes.push(`${decoys.size} friendly decoy ghost${decoys.size === 1 ? " is" : "s are"} on guard and ignored.`);
    }

    // Vampires: lockfiles against OSV.dev
    const { packages, skipped } = parseLockfiles(lockFiles);
    if (skipped > 0) notes.push(`${skipped} dependency entries could not be checked (unpinned or unknown format).`);
    const byPath = new Map(textFiles.map((f) => [f.path, f.content]));
    const packageJson = new Map<string, string>();
    for (const l of lockFiles) {
      const pj = l.path.replace(/[^/]+$/, "package.json");
      const text = byPath.get(pj);
      if (text) packageJson.set(l.path, text);
    }
    const vampires = await findVampires(packages, packageJson, signal);
    if (vampires.note) notes.push(vampires.note);

    // Code and repo creatures (spiders, bats, zombies, possessed, poltergeists, mummies, skeletons)
    const others = tree ? runRepoScanners({ tree, codeFiles, textFiles, lockFiles, notes, repo: `${owner}/${repo}` }) : { findings: [], stack: undefined };

    const findings: Finding[] = sortFindings([...collectGhosts(historyHits, tree ? headHits : undefined), ...vampires.findings, ...others.findings]);

    if (signal.aborted) {
      notes.push(`Stopped after ${Math.round(DEADLINE_MS / 1000)} s: ${diffs.length} of ${shas.length} commits scanned.`);
    } else if (diffs.length < shas.length) {
      notes.push(`${shas.length - diffs.length} commits could not be loaded and were skipped.`);
    }

    return {
      repo: `${owner}/${repo}`,
      defaultBranch: branch,
      commitsScanned: diffs.length,
      filesScanned: codeFiles.length + textFiles.length + lockFiles.length,
      durationMs: Date.now() - started,
      partial: notes.some((n) => /Stopped|could not|did not/i.test(n)),
      notes,
      findings,
      score: score(findings),
      stack: others.stack,
      packages: packages.map((p) => ({ name: p.name, version: p.version, ecosystem: p.ecosystem })),
    };
  } finally {
    clearTimeout(timer);
  }
}
