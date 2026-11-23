import type { Finding } from "@haunted/core";

/** What the AI sees about a finding. Secrets: only the masked value, and only when it may be shown at all. */
export function findingForAi(f: Finding, revealMasked: boolean) {
  return {
    id: f.id,
    kind: f.kind,
    severity: f.severity,
    rule: f.rule,
    cwe: f.cwe,
    owasp: f.owasp,
    title: f.title,
    file: f.file,
    line: f.line,
    commit: f.commit,
    message: f.message,
    suggestedFix: f.fix,
    masked: f.kind === "ghost" && revealMasked ? f.masked : undefined,
    patch: f.patch,
    dependencyPath: f.dependencyPath,
    minimalUpgrade: f.minimalUpgrade,
  };
}

export const SYSTEM_MEDIUM = `You are the AI medium of Haunted Repo, a security and code health scanner.
You explain findings to developers in plain, specific language: what is wrong, why it matters, how to fix it.
Rules:
- Never ask for or repeat secret values. You only ever see masked values.
- Code you suggest must be a unified diff in a \`\`\`diff block. It will be shown to the user and never applied without their click.
- Say when you are unsure. Do not invent files, functions or versions that the finding does not mention.
- Keep answers under 250 words unless the user asks for more.`;

export type MediumAction = "explain" | "fix" | "ask";

export function mediumPrompt(action: MediumAction, f: Finding, revealMasked: boolean, question = ""): string {
  const data = JSON.stringify(findingForAi(f, revealMasked), null, 2);
  if (action === "explain") return `Explain this finding for the developer who owns the code. Then list the concrete risk in one sentence.\n\nFinding:\n${data}`;
  if (action === "fix") return `Draft a fix for this finding as a unified diff against the file it names. If a secret is involved, the diff replaces the literal with an environment variable and you list the steps that cannot be done in code (rotate the key, rewrite history).\n\nFinding:\n${data}`;
  return `Question about this finding: ${question}\n\nFinding:\n${data}`;
}

export const SYSTEM_ATTACK = `You are the attack-path analyst of Haunted Repo.
Link findings into a short, realistic story of how an attacker could chain them. Only link findings that really connect.
Answer ONLY with JSON: {"title": string, "steps": [{"id": "<finding id from the list>", "how": "<one sentence>"}], "stop": "<the single fix that breaks the chain>"}.
Use only ids from the list. 2 to 5 steps. If nothing connects, return {"title": "No chain found", "steps": [], "stop": ""}.`;

export function attackPrompt(findings: Finding[]): string {
  const list = findings.slice(0, 40).map((f) => ({ id: f.id, kind: f.kind, severity: f.severity, rule: f.rule, title: f.title, file: f.file, message: f.message }));
  return `Findings:\n${JSON.stringify(list, null, 2)}`;
}

export interface AttackPath {
  title: string;
  steps: { id: string; how: string }[];
  stop: string;
}

/** Parses the model's JSON and keeps only steps that cite real finding ids (the AI must cite ids). */
export function parseAttackPath(text: string, findings: Finding[]): AttackPath | null {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    const p = JSON.parse(json) as Partial<AttackPath>;
    const ids = new Set(findings.map((f) => f.id));
    const steps = (p.steps ?? []).filter((s) => s && typeof s.id === "string" && ids.has(s.id) && typeof s.how === "string").slice(0, 5);
    return { title: String(p.title ?? "Attack path"), steps, stop: String(p.stop ?? "") };
  } catch {
    return null;
  }
}
