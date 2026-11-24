import type { Finding } from "../types";

/**
 * One-line auto-fixes for rules whose finding carries no patch yet.
 * Each fix only rewrites the flagged line, and only when the whole statement sits on that line.
 * Returns the new line, or null when the line does not have the expected shape.
 */
function balanced(s: string): boolean {
  let d = 0;
  for (const c of s) {
    if (c === "(") d++;
    else if (c === ")" && --d < 0) return false;
  }
  return d === 0;
}

const FIXERS: Record<string, (line: string) => string | null> = {
  // foo(); → foo().catch((err) => console.error(err));
  "zombie/floating-promise": (line) => {
    const m = /^(\s*)(.*\))(;?)(\s*(?:\/\/.*)?)$/.exec(line);
    if (!m || /^\s*(await|return|void|const|let|var)\b/.test(line) || !balanced(m[2]!)) return null;
    if (/\.catch\(/.test(m[2]!)) return null;
    return `${m[1]}${m[2]}.catch((err) => console.error(err))${m[3] || ";"}${m[4] ?? ""}`;
  },
  // el.innerHTML = x → el.textContent = x
  "spider/inner-html": (line) => (/\.innerHTML\s*=(?!=)/.test(line) ? line.replace(/\.innerHTML(\s*=)(?!=)/, ".textContent$1") : null),
  // rejectUnauthorized: false → true
  "spider/tls-off": (line) => (/rejectUnauthorized\s*:\s*false/.test(line) ? line.replace(/(rejectUnauthorized\s*:\s*)false/, "$1true") : null),
  // createHash("md5") → createHash("sha256")
  "spider/weak-hash": (line) => (/createHash\(\s*(["'`])(md5|sha1)\1\s*\)/i.test(line) ? line.replace(/createHash\(\s*(["'`])(md5|sha1)\1\s*\)/i, "createHash($1sha256$1)") : null),
};

export const canSynthesize = (rule: string) => rule in FIXERS;

export function synthLine(rule: string, line: string): string | null {
  const fix = FIXERS[rule];
  if (!fix) return null;
  try {
    const out = fix(line);
    return out !== null && out !== line ? out : null;
  } catch {
    return null;
  }
}

/** A unified diff for the flagged line (no context: applyParsed still checks the removed line matches). */
export function synthPatch(f: Finding, lineText: string): string | null {
  if (!f.line || f.kind === "ghost") return null;
  const next = synthLine(f.rule, lineText);
  if (next === null) return null;
  return `--- a/${f.file}\n+++ b/${f.file}\n@@ -${f.line},1 +${f.line},1 @@\n-${lineText}\n+${next}\n`;
}
