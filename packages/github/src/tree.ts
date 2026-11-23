import { gh, pool, raw } from "./client";

export const MAX_FILES = 200;
export const MAX_SECRET_FILES = 150;
export const MAX_FILE_BYTES = 200 * 1024;

const CODE_EXT = /\.(?:js|jsx|ts|tsx|mjs|cjs)$/i;
const SKIP_DIR = /(?:^|\/)(?:node_modules|dist|build|\.next|out|coverage|vendor|\.git)\//;
const MINIFIED = /\.min\.(?:js|mjs|cjs)$/i;
/** Text files where secrets often hide, beyond code. */
const SECRET_FILE =
  /(?:^|\/)(?:\.env[^/]*|\.npmrc|\.pypirc|docker-compose[^/]*\.ya?ml|Dockerfile)$|\.(?:json|ya?ml|toml|ini|cfg|conf|properties|sh|bash|zsh|ps1|py|rb|php|go|java|kt|cs|tf|tfvars|md|txt|xml|pem|key)$/i;
const LOCKFILE = /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|requirements\.txt)$/;
const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/;

export interface TreeEntry {
  path: string;
  size: number;
}

export interface SourceFile {
  path: string;
  content: string;
}

export interface RepoTree {
  code: TreeEntry[];
  secretFiles: TreeEntry[];
  lockfiles: TreeEntry[];
  workflows: TreeEntry[];
  truncated: boolean;
}

export async function fetchTree(owner: string, repo: string, branch: string, signal?: AbortSignal): Promise<RepoTree> {
  const t = await gh<{ tree: { path: string; type: string; size?: number }[]; truncated?: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    signal,
  );
  const blobs = t.tree
    .filter((e) => e.type === "blob" && !SKIP_DIR.test(e.path))
    .map((e) => ({ path: e.path, size: e.size ?? 0 }));
  const small = blobs.filter((e) => e.size <= MAX_FILE_BYTES);
  const code = small.filter((e) => CODE_EXT.test(e.path) && !MINIFIED.test(e.path)).slice(0, MAX_FILES);
  const codeSet = new Set(code.map((e) => e.path));
  return {
    code,
    secretFiles: small.filter((e) => !codeSet.has(e.path) && SECRET_FILE.test(e.path) && !LOCKFILE.test(e.path)).slice(0, MAX_SECRET_FILES),
    lockfiles: blobs.filter((e) => LOCKFILE.test(e.path) && e.size <= 20 * 1024 * 1024),
    workflows: small.filter((e) => WORKFLOW.test(e.path)),
    truncated: Boolean(t.truncated),
  };
}

/** Loads file contents from raw.githubusercontent.com (does not count against the API limit). */
export async function fetchFiles(
  owner: string,
  repo: string,
  branch: string,
  entries: TreeEntry[],
  signal?: AbortSignal,
): Promise<SourceFile[]> {
  return pool(
    entries,
    8,
    async (e) => {
      const content = await raw(owner, repo, branch, e.path, signal);
      if (content === null || content.includes("\u0000")) throw new Error("skip");
      return { path: e.path, content };
    },
    signal,
  );
}
