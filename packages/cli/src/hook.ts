import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { collectGhosts, scanPatch, type Finding, type SecretHit } from "@haunted/core";

/** The bypass must be typed out in full (feature 16), so nobody skips the guard by habit. */
export const BYPASS = "HAUNTED_REPO_ALLOW_SECRET=i-know-this-commits-a-secret";
const MARK = "# haunted-repo pre-commit guard";

export async function installHook(root: string): Promise<string> {
  const gitDir = execFileSync("git", ["rev-parse", "--git-dir"], { cwd: root, encoding: "utf8" }).trim();
  const hooks = join(root, gitDir, "hooks");
  await mkdir(hooks, { recursive: true });
  const path = join(hooks, "pre-commit");
  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch {
    /* no hook yet */
  }
  if (existing.includes(MARK)) return `${path} already has the guard.`;
  if (existing) await writeFile(`${path}.before-haunted-repo`, existing);
  const body = `#!/bin/sh\n${MARK}\nnpx --yes haunted-repo pre-commit || exit 1\n${existing && !existing.startsWith("#!") ? existing : existing.split("\n").slice(1).join("\n")}`;
  await writeFile(path, body);
  await chmod(path, 0o755);
  return `Installed ${path}${existing ? " (your old hook runs after the guard; a copy is in pre-commit.before-haunted-repo)" : ""}.`;
}

/** Scans only lines the commit adds. Returns the ghosts it found (masked). */
export function stagedGhosts(root: string): Finding[] {
  const diff = execFileSync("git", ["diff", "--cached", "--unified=0", "--no-color", "--diff-filter=ACM"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const hits: SecretHit[] = [];
  let file = "";
  let chunk: string[] = [];
  const flush = () => {
    if (file && chunk.length) hits.push(...scanPatch(chunk.join("\n"), { file, commit: "staged", date: null }));
    chunk = [];
  };
  for (const line of diff.split("\n")) {
    const m = /^\+\+\+ b\/(.+)$/.exec(line);
    if (m) {
      flush();
      file = m[1]!;
      continue;
    }
    if (line.startsWith("@@") || (line.startsWith("+") && !line.startsWith("+++"))) chunk.push(line);
  }
  flush();
  return collectGhosts(hits).filter((g) => g.severity !== "low");
}
