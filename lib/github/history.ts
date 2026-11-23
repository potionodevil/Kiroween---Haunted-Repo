import "server-only";
import { gh, pool } from "./client";

export const MAX_COMMITS = 300;

export interface RepoInfo {
  defaultBranch: string;
  private: boolean;
}

export interface CommitDiff {
  sha: string;
  date: string | null;
  files: { filename: string; patch?: string }[];
}

export async function fetchRepo(owner: string, repo: string, signal?: AbortSignal): Promise<RepoInfo> {
  const r = await gh<{ default_branch: string; private: boolean }>(`/repos/${owner}/${repo}`, signal);
  return { defaultBranch: r.default_branch, private: r.private };
}

/** Newest first, at most MAX_COMMITS. */
export async function fetchCommitShas(
  owner: string,
  repo: string,
  branch: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const shas: string[] = [];
  for (let page = 1; shas.length < MAX_COMMITS && page <= 3; page++) {
    const list = await gh<{ sha: string }[]>(
      `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=100&page=${page}`,
      signal,
    );
    shas.push(...list.map((c) => c.sha));
    if (list.length < 100) break;
  }
  return shas.slice(0, MAX_COMMITS);
}

/** Loads diffs with concurrency 8. Keeps newest-first order. */
export async function fetchDiffs(
  owner: string,
  repo: string,
  shas: string[],
  signal?: AbortSignal,
): Promise<CommitDiff[]> {
  return pool(
    shas,
    8,
    async (sha) => {
      const c = await gh<{
        sha: string;
        commit: { author?: { date?: string } | null };
        files?: { filename: string; patch?: string }[];
      }>(`/repos/${owner}/${repo}/commits/${sha}`, signal);
      return { sha: c.sha, date: c.commit.author?.date ?? null, files: c.files ?? [] };
    },
    signal,
  );
}
