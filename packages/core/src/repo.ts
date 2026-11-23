const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

export interface RepoRef {
  owner: string;
  repo: string;
}

/**
 * Accepts "owner/repo", "github.com/owner/repo" and "https://github.com/owner/repo(.git)(/...)".
 * Returns null for anything else.
 */
export function parseRepo(input: string): RepoRef | null {
  let s = input.trim();
  s = s.replace(/^https?:\/\//i, "").replace(/^(www\.)?github\.com\//i, "");
  s = s.replace(/[?#].*$/, "");
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0]!;
  const repo = parts[1]!.replace(/\.git$/i, "");
  if (!NAME.test(owner) || !NAME.test(repo)) return null;
  if (owner === "." || owner === ".." || repo === "." || repo === "..") return null;
  // Only bare "owner/repo" or a github.com URL may have extra path segments.
  if (parts.length > 2 && !/github\.com/i.test(input)) return null;
  return { owner, repo };
}
