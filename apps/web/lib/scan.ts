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

export const DEADLINE_MS = 55_000;

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

    // History and current files load in parallel under one deadline.
    const [diffs, codeFiles, secretFiles] = await Promise.all([
      fetchDiffs(owner, repo, shas, signal),
      tree ? fetchFiles(owner, repo, branch, tree.code, signal) : Promise.resolve<SourceFile[]>([]),
      tree ? fetchFiles(owner, repo, branch, tree.secretFiles, signal) : Promise.resolve<SourceFile[]>([]),
    ]);

    const historyHits: SecretHit[] = [];
    for (const d of diffs) {
      for (const f of d.files) {
        if (f.patch) historyHits.push(...scanPatch(f.patch, { file: f.filename, commit: d.sha.slice(0, 7), date: d.date }));
      }
    }
    const headHits: SecretHit[] = [];
    for (const f of [...codeFiles, ...secretFiles]) {
      headHits.push(...scanText(f.content, { file: f.path, commit: HEAD, date: null }));
    }

    const findings: Finding[] = sortFindings([
      ...collectGhosts(historyHits, tree ? headHits : undefined),
      // Vampires, zombies, bats and the other creatures plug in here.
    ]);

    if (signal.aborted) {
      notes.push(`Stopped after ${Math.round(DEADLINE_MS / 1000)} s: ${diffs.length} of ${shas.length} commits scanned.`);
    } else if (diffs.length < shas.length) {
      notes.push(`${shas.length - diffs.length} commits could not be loaded and were skipped.`);
    }

    return {
      repo: `${owner}/${repo}`,
      defaultBranch: branch,
      commitsScanned: diffs.length,
      filesScanned: codeFiles.length + secretFiles.length,
      durationMs: Date.now() - started,
      partial: notes.length > 0,
      notes,
      findings,
      score: score(findings),
    };
  } finally {
    clearTimeout(timer);
  }
}
