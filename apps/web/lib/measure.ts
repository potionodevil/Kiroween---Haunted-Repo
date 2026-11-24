import type { CreatureKind, Finding } from "@haunted/core";

/** How each creature was found: the method, in plain words, plus the facts from the finding itself. */
const METHOD: Record<CreatureKind, string> = {
  ghost: "Matched the key pattern for this provider and checked how random the value is (Shannon entropy). We looked at the files at HEAD and at up to 300 commits of history, including deleted files.",
  vampire: "Read the exact version from your lockfile and asked OSV.dev, the open vulnerability database, for advisories on that version.",
  spider: "Parsed the file into a syntax tree with @typescript-eslint/parser and ran a security rule that follows the value from input to the risky call.",
  poltergeist: "Read your GitHub Actions workflows and repo setup files and checked them against known CI attacks (pull_request_target, script injection, unpinned actions).",
  possessed: "Read agent config files (mcp.json, AGENTS.md) and looked for code where model output reaches a shell, eval or a file write.",
  zombie: "Ran ESLint core rules plus our own rules on the syntax tree. These patterns cause bugs at runtime.",
  bat: "Matched slow patterns on the syntax tree: queries inside loops, whole-library imports and listeners without cleanup.",
  banshee: "Ran install, build and tests in a sealed sandbox. The failing output is the proof.",
  skeleton: "Counted files, lines and imports across the repo tree and looked for tests, CI and raw SQL.",
  mummy: "Compared README, SECURITY.md and agent files with what package.json and the code actually say.",
};

/** The detection method for a creature kind, in plain words. */
export const methodFor = (k: CreatureKind): string => METHOD[k];

export interface Measurement {
  method: string;
  facts: [string, string][];
  evidence: string[];
}

export function measurement(f: Finding): Measurement {
  const facts: [string, string][] = [["Rule", f.rule]];
  if (f.file) facts.push(["Where", f.line ? `${f.file}:${f.line}` : f.file]);
  if (f.commit) facts.push(["Commit", f.commit]);
  if (f.introducedAt) facts.push(["Since", new Date(f.introducedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })]);
  if (f.cwe) facts.push(["CWE", f.cwe]);
  if (f.owasp) facts.push(["OWASP", f.owasp]);
  if (f.dependencyPath?.length) facts.push(["Path", f.dependencyPath.join(" → ")]);
  if (f.minimalUpgrade) facts.push(["Upgrade", f.minimalUpgrade]);
  facts.push(["Confidence", f.confidence ?? (f.kind === "skeleton" ? "medium" : "high")]);
  return { method: METHOD[f.kind], facts, evidence: f.evidence ?? [] };
}
