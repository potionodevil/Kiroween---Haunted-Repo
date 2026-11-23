import type { Finding, Severity } from "./types";

export const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 20, warning: 8, low: 3 };

export function score(findings: Finding[], banished: ReadonlySet<string> = new Set()): number {
  let sum = 0;
  for (const f of findings) if (!banished.has(f.id)) sum += SEVERITY_WEIGHT[f.severity];
  return Math.min(100, sum);
}

export function scoreLabel(s: number): string {
  if (s <= 0) return "The house is quiet";
  if (s < 30) return "A little drafty";
  if (s < 70) return "Haunted";
  return "Badly haunted";
}

const ORDER: Record<Severity, number> = { critical: 0, warning: 1, low: 2 };

/** Critical first, then ghosts before zombies before bats, then file path. */
export function sortFindings(findings: Finding[]): Finding[] {
  const kindOrder = { ghost: 0, zombie: 1, bat: 2 } as const;
  return [...findings].sort(
    (a, b) =>
      ORDER[a.severity] - ORDER[b.severity] ||
      kindOrder[a.kind] - kindOrder[b.kind] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
}
