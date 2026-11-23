import "server-only";
import type { Finding, ScanResult } from "@haunted/core";
import type { RepoRef } from "@haunted/core";
import { GitHubError } from "@haunted/github";
import { fetchCommitShas, fetchDiffs, fetchRepo } from "@haunted/github";
import { fetchHeadFiles } from "@haunted/github";
import { collectGhosts, scanPatch, type SecretHit } from "@haunted/core";
import { score, sortFindings } from "@haunted/core";

export const DEADLINE_MS = 45_000;

export async function scanRepo({ owner, repo }: RepoRef): Promise<ScanResult> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEADLINE_MS);
  const signal = ctrl.signal;

  try {
    const info = await fetchRepo(owner, repo, signal);
    if (info.private) throw new GitHubError(404, "We can only see public repos");

    const [shas, files] = await Promise.all([
      fetchCommitShas(owner, repo, info.defaultBranch, signal),
      fetchHeadFiles(owner, repo, info.defaultBranch, signal).catch((e) => {
        if (e instanceof GitHubError && e.status === 429) throw e;
        return [];
      }),
    ]);
    const diffs = await fetchDiffs(owner, repo, shas, signal);

    const hits: SecretHit[] = [];
    for (const d of diffs) {
      for (const f of d.files) {
        if (!f.patch) continue;
        hits.push(...scanPatch(f.patch, { file: f.filename, commit: d.sha.slice(0, 7), date: d.date }));
      }
    }

    const findings: Finding[] = sortFindings([
      ...collectGhosts(hits),
      // Zombies and bats plug in here (scanner tasks 6 and 7), using `files`.
    ]);

    return {
      repo: `${owner}/${repo}`,
      defaultBranch: info.defaultBranch,
      commitsScanned: diffs.length,
      filesScanned: files.length,
      durationMs: Date.now() - started,
      partial: signal.aborted || diffs.length < shas.length,
      findings,
      score: score(findings),
    };
  } finally {
    clearTimeout(timer);
  }
}
