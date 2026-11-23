import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { envLookup, locateSecrets, mask, unifiedPatch } from "@haunted/core";

/**
 * Feature 15, the watcher's replace step. Moves hard-coded secrets from one file into .env.local:
 * literal → env lookup for the file type, value → .env.local, .env* → .gitignore, original → .haunted/backup/.
 * Local only: nothing here touches the network, and paths outside the root are refused by the caller.
 */
export interface ExorciseResult {
  file: string;
  replaced: { envVar: string; rule: string }[];
  backup: string;
  diff: string;
  undo: string;
}

async function readOr(path: string, fallback = ""): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return fallback;
  }
}

function envLine(existing: string, name: string, value: string): { text: string; name: string } {
  const current = new Map(existing.split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1)]));
  if (current.get(name) === value) return { text: "", name };
  let n = name;
  for (let i = 2; current.has(n); i++) n = `${name}_${i}`;
  return { text: `${n}=${value}\n`, name: n };
}

export async function exorciseFile(root: string, rel: string, opts: { dryRun?: boolean; now?: () => number } = {}): Promise<ExorciseResult | null> {
  const full = join(root, rel);
  const original = await readFile(full, "utf8");
  const found = locateSecrets(original).filter((s) => envLookup(rel, s.envVar, s.quoted) !== undefined);
  if (found.length === 0) return null;

  const envPath = join(root, ".env.local");
  let envText = await readOr(envPath);
  let next = original;
  const replaced: { envVar: string; rule: string }[] = [];
  // replace from the end so earlier offsets stay valid
  for (const s of [...found].sort((a, b) => b.start - a.start)) {
    const line = envLine(envText, s.envVar, s.value);
    envText += line.text;
    const lookup = envLookup(rel, line.name, s.quoted)!;
    const from = s.quoted ? s.start - 1 : s.start;
    const to = s.quoted ? s.end + 1 : s.end;
    next = next.slice(0, from) + lookup + next.slice(to);
    replaced.unshift({ envVar: line.name, rule: s.rule });
  }

  const stamp = (opts.now ?? Date.now)();
  const backupRel = `.haunted/backup/${rel}.${stamp}.bak`;
  // the diff is printed to the terminal: mask the removed values (security.md rule 1)
  let diff = unifiedPatch(rel, original, next) ?? "";
  for (const s of found) diff = diff.split(s.value).join(mask(s.value, s.value.startsWith("sk_") || s.value.startsWith("rk_") ? 8 : 4));
  const undo = `npx haunted-repo undo ${backupRel}`;
  if (opts.dryRun) return { file: rel, replaced, backup: backupRel, diff, undo };

  await mkdir(dirname(join(root, backupRel)), { recursive: true });
  await writeFile(join(root, backupRel), original, "utf8");
  await writeFile(envPath, envText, "utf8");
  await writeFile(full, next, "utf8");

  const gi = join(root, ".gitignore");
  const gitignore = await readOr(gi);
  const need = [".env*", "!.env.example", ".haunted/backup/"].filter((l) => !gitignore.split(/\r?\n/).includes(l));
  if (need.length) await writeFile(gi, `${gitignore}${gitignore && !gitignore.endsWith("\n") ? "\n" : ""}${need.join("\n")}\n`, "utf8");

  return { file: rel, replaced, backup: backupRel, diff, undo };
}

/** Restores a file from its backup, byte for byte. The backup name encodes the original path. */
export async function undoBackup(root: string, backupRel: string): Promise<string> {
  const m = /^\.haunted\/backup\/(.+)\.\d+\.bak$/.exec(backupRel.replace(/\\/g, "/"));
  if (!m) throw new Error("Not a Haunted Repo backup path.");
  const target = m[1]!;
  await writeFile(join(root, target), await readFile(join(root, backupRel)));
  return target;
}
