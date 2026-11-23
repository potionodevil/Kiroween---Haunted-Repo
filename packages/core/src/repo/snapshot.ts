import type { CreatureKind, Finding, Severity } from "../types";
import { stableId } from "../id";

/** What repo-level scanners see: every path, plus the text of the files that were loaded. */
export interface RepoSnapshot {
  paths: string[];
  files: Map<string, string>;
}

export function snapshot(paths: string[], files: { path: string; content: string }[]): RepoSnapshot {
  return { paths, files: new Map(files.map((f) => [f.path, f.content])) };
}

export function has(s: RepoSnapshot, re: RegExp): boolean {
  return s.paths.some((p) => re.test(p));
}

export function read(s: RepoSnapshot, path: string): string | undefined {
  return s.files.get(path);
}

export function lineOf(text: string, index: number): number {
  return text.slice(0, Math.max(0, index)).split("\n").length;
}

export function finding(
  kind: CreatureKind,
  severity: Severity,
  rule: string,
  title: string,
  file: string,
  message: string,
  fix: string,
  extra: Partial<Finding> = {},
): Finding {
  return {
    id: stableId(kind, [rule, file, extra.line]),
    kind,
    severity,
    rule,
    title,
    file,
    message,
    fix,
    autoFixable: Boolean(extra.patch),
    ...extra,
  };
}

/** Diff that creates a new file. */
export function newFilePatch(file: string, content: string): string {
  const lines = content.replace(/\n$/, "").split("\n");
  return `--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => `+${l}`).join("\n")}\n`;
}

/** Diff that appends lines to the end of an existing file. */
export function appendPatch(file: string, current: string, add: string[]): string {
  const lines = current.replace(/\n$/, "").split("\n");
  const n = lines.length;
  const last = lines[n - 1] ?? "";
  return `--- a/${file}\n+++ b/${file}\n@@ -${n},1 +${n},${add.length + 1} @@\n ${last}\n${add.map((l) => `+${l}`).join("\n")}\n`;
}
