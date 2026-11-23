import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import type { LocalFile } from "@haunted/core/code";

const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", "out", "coverage", "vendor", ".haunted", ".turbo", ".vercel"]);
const TEXT = /\.(m?[jt]sx?|cjs|mts|cts|json|ya?ml|toml|ini|cfg|conf|properties|env|sh|bash|zsh|ps1|py|rb|php|go|java|kt|cs|tf|tfvars|md|txt|xml|lock)$|(^|[\\/])(\.env[^\\/]*|\.npmrc|\.gitignore|Dockerfile|\.cursorrules|LICENSE|README)$/i;
export const MAX_LOCAL_FILES = 2000;
export const MAX_LOCAL_BYTES = 200 * 1024;

/** Walks a working tree and loads text files under 200 KB. Paths are repo-relative with forward slashes. */
export async function readTree(root: string): Promise<{ files: LocalFile[]; paths: string[] }> {
  const base = resolve(root);
  const files: LocalFile[] = [];
  const paths: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (paths.length >= MAX_LOCAL_FILES) return;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP.has(e.name)) await walk(full);
        continue;
      }
      if (!e.isFile()) continue;
      const rel = relative(base, full).split(sep).join("/");
      paths.push(rel);
      if (!TEXT.test(rel)) continue;
      try {
        const s = await stat(full);
        if (s.size > MAX_LOCAL_BYTES && !rel.endsWith(".lock") && !rel.endsWith("package-lock.json")) continue;
        const content = await readFile(full, "utf8");
        if (!content.includes("\u0000")) files.push({ path: rel, content });
      } catch {
        /* unreadable file: skipped */
      }
    }
  }
  await walk(base);
  return { files, paths };
}

/** Resolves a user path and refuses anything outside the root (the watcher and MCP never leave the working tree). */
export function insideRoot(root: string, p: string): string | null {
  const base = resolve(root);
  const full = resolve(base, p);
  return full === base || full.startsWith(base + sep) ? full : null;
}
