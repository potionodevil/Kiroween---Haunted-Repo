import { gh, pool, raw } from "./client";

export const MAX_FILES = 200;
export const MAX_FILE_BYTES = 200 * 1024;
const CODE_EXT = /\.(?:js|jsx|ts|tsx|mjs|cjs)$/i;
const SKIP_DIR = /(?:^|\/)(?:node_modules|dist|build|\.next|out|coverage|vendor)\//;
const MINIFIED = /\.min\.(?:js|mjs|cjs)$/i;

export interface SourceFile {
  path: string;
  content: string;
}

export async function fetchHeadFiles(
  owner: string,
  repo: string,
  branch: string,
  signal?: AbortSignal,
): Promise<SourceFile[]> {
  const tree = await gh<{ tree: { path: string; type: string; size?: number }[] }>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    signal,
  );
  const picks = tree.tree
    .filter(
      (t) =>
        t.type === "blob" &&
        CODE_EXT.test(t.path) &&
        !SKIP_DIR.test(t.path) &&
        !MINIFIED.test(t.path) &&
        (t.size ?? 0) <= MAX_FILE_BYTES,
    )
    .slice(0, MAX_FILES);

  const files = await pool(
    picks,
    8,
    async (t) => {
      const content = await raw(owner, repo, branch, t.path, signal);
      if (content === null || content.includes("\u0000")) throw new Error("skip");
      return { path: t.path, content };
    },
    signal,
  );
  return files;
}
