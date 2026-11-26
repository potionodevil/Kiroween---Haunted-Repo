/**
 * Applies the unified diffs that findings carry (feature: auto-fix pull requests).
 * Pure: text in, text out. Returns null when the patch does not fit the file, so a PR never gets a broken file.
 */

interface Hunk {
  oldStart: number;
  lines: string[];
}

export interface ParsedPatch {
  file: string;
  /** True for `--- /dev/null` patches that create the file. */
  created: boolean;
  hunks: Hunk[];
}

const HUNK = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/;

/** Splits a text that may hold several file patches. Never throws. */
export function parsePatches(text: string): ParsedPatch[] {
  const out: ParsedPatch[] = [];
  let cur: ParsedPatch | null = null;
  let hunk: Hunk | null = null;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.startsWith("--- ") && lines[i + 1]?.startsWith("+++ ")) {
      const to = lines[i + 1]!.slice(4).trim().replace(/^b\//, "");
      cur = { file: to, created: l.slice(4).trim() === "/dev/null", hunks: [] };
      out.push(cur);
      hunk = null;
      i++;
      continue;
    }
    const m = HUNK.exec(l);
    if (m && cur) {
      hunk = { oldStart: Number(m[1]), lines: [] };
      cur.hunks.push(hunk);
      continue;
    }
    if (hunk && (l.startsWith(" ") || l.startsWith("+") || l.startsWith("-"))) hunk.lines.push(l);
  }
  return out.filter((p) => p.file && p.hunks.length > 0);
}

/** Comment prefix per file type, used to mark changed lines. null = file type has no comments (JSON). */
export function commentFor(file: string): string | null {
  const f = file.toLowerCase();
  if (/\.(m?[jt]sx?|cjs|mts|cts|java|go|rs|c|cc|cpp|h|cs|kt|swift|php|scss)$/.test(f)) return "//";
  if (/\.(ya?ml|py|rb|sh|toml|tf)$/.test(f) || /(^|\/)(\.gitignore|\.env\.example|dockerfile)$/.test(f)) return "#";
  if (/\.(md|html)$/.test(f)) return "<!--";
  return null;
}

function markerLine(file: string, indent: string, note: string, line = ""): string | null {
  const c = commentFor(file);
  if (!c) return null;
  const text = `haunted-repo: ${note}`;
  // Inside JSX a "//" line would render as text, so JSX children get {/* ... */}.
  if (/\.[jt]sx$/i.test(file) && /^\s*[<{]/.test(line)) return `${indent}{/* ${text} */}`;
  return c === "<!--" ? `${indent}<!-- ${text} -->` : `${indent}${c} ${text}`;
}

/**
 * Applies one parsed patch to `source` (use "" for created files).
 * `mark` adds a comment above each changed block so reviewers see what the fix touched.
 * Returns null when a context or removed line does not match.
 */
export function applyParsed(source: string, patch: ParsedPatch, mark?: string): string | null {
  const src = patch.created ? [] : source.split("\n");
  const out: string[] = [];
  let pos = 0;
  for (const h of patch.hunks) {
    const start = Math.max(0, h.oldStart - 1);
    if (start < pos) return null;
    while (pos < start) {
      if (pos >= src.length) return null;
      out.push(src[pos++]!);
    }
    let marked = false;
    for (const l of h.lines) {
      const body = l.slice(1);
      if (l[0] === " ") {
        if (src[pos] !== body) return null;
        out.push(src[pos++]!);
        continue;
      }
      if (mark && !marked && !patch.created) {
        const indent = /^\s*/.exec(l[0] === "-" ? (src[pos] ?? "") : body)?.[0] ?? "";
        const m = markerLine(patch.file, indent, mark, l[0] === "-" ? (src[pos] ?? "") : body);
        if (m) out.push(m);
        marked = true;
      }
      if (l[0] === "-") {
        if (src[pos] !== body) return null;
        pos++;
      } else out.push(body);
    }
  }
  while (pos < src.length) out.push(src[pos++]!);
  return out.join("\n");
}

/** Applies every patch for `file` from `patchText` to `source`. Returns null if any part does not fit. */
export function applyPatchText(source: string, patchText: string, file: string, mark?: string): string | null {
  let cur: string | null = source;
  for (const p of parsePatches(patchText).filter((x) => x.file === file)) {
    if (cur === null) return null;
    cur = applyParsed(cur, p, mark);
  }
  return cur;
}
