/** Minimal unified diff for one changed region between two versions of a file. */
export function unifiedPatch(file: string, before: string, after: string, context = 1): string | undefined {
  if (before === after) return undefined;
  const a = before.split("\n");
  const b = after.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA--;
    endB--;
  }
  const from = Math.max(0, start - context);
  const toA = Math.min(a.length - 1, endA + context);
  const toB = Math.min(b.length - 1, endB + context);
  const lines: string[] = [];
  for (let i = from; i < start; i++) lines.push(` ${a[i]}`);
  for (let i = start; i <= endA; i++) lines.push(`-${a[i]}`);
  for (let i = start; i <= endB; i++) lines.push(`+${b[i]}`);
  for (let i = endA + 1; i <= toA; i++) lines.push(` ${a[i]}`);
  const lenA = toA - from + 1;
  const lenB = toB - from + 1;
  return `--- a/${file}\n+++ b/${file}\n@@ -${from + 1},${lenA} +${from + 1},${lenB} @@\n${lines.join("\n")}\n`;
}

/** Applies one ESLint-style fix (character range + replacement). */
export function applyFix(source: string, fix: { range: [number, number]; text: string }): string {
  return source.slice(0, fix.range[0]) + fix.text + source.slice(fix.range[1]);
}
