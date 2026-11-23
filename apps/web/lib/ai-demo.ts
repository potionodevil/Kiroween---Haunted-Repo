import type { Finding } from "@haunted/core";
import type { AttackPath, MediumAction } from "./ai-prompts";

/** Prepared AI answers for the demo repo, so the demo works without any key (master prompt feature 4). */
export function demoMediumAnswer(action: MediumAction, f: Finding, question = ""): string {
  if (action === "fix") {
    if (f.patch) return `Here is the smallest change that removes the ${f.kind}:\n\n\`\`\`diff\n${f.patch}\`\`\`\n\nReview it, apply it with \`git apply\`, and run your tests. ${f.fix}`;
    if (f.kind === "ghost")
      return `A secret cannot be fixed by code alone. In code, replace the literal with an environment variable:\n\n\`\`\`diff\n--- a/${f.file}\n+++ b/${f.file}\n@@ -${f.line ?? 1},1 +${f.line ?? 1},1 @@\n-const key = "${f.masked ?? "<secret>"}";\n+const key = process.env.STRIPE_SECRET_KEY;\n\`\`\`\n\nThen, outside the code: 1. roll the key at the provider, 2. store the new one in your host's env settings, 3. remove the old one from all ${f.ghost?.commitCount ?? "affected"} commits with git filter-repo, 4. install the pre-commit hook.`;
    return `There is no safe mechanical patch for this one. ${f.fix} I would start in ${f.file}${f.line ? ` around line ${f.line}` : ""}.`;
  }
  if (action === "ask") {
    return `Good question. For "${f.title}": ${f.message} The fix stays the same: ${f.fix}${question.toLowerCase().includes("urgent") || question.toLowerCase().includes("priority") ? ` Priority: ${f.severity === "critical" ? "today" : f.severity === "warning" ? "this sprint" : "when you touch the file"}.` : ""}`;
  }
  const why: Record<string, string> = {
    ghost: "Deleting the file did not delete the key: every clone and fork still has the commit, and bots scrape new commits within minutes.",
    vampire: "Your code may never call the vulnerable function, but the package ships with your app, and attackers scan for known versions.",
    spider: "The value comes straight from the request. An attacker can change the meaning of the statement, not just its data.",
    poltergeist: "CI runs with your secrets and a token that can push. Whatever controls that step controls your release.",
    possessed: "A model can be talked into anything through the text it reads. Whatever its output touches is now attacker-controlled.",
    zombie: "This does not crash now. It fails quietly later, usually in the path you test least.",
    bat: "It is fine with 10 rows and slow with 10,000. Load grows with your users, not with your code.",
    banshee: "The tests already tell you something is broken. Users will find it next.",
    skeleton: "Nothing is broken today. Every change costs a little more until the file is too big to change safely.",
    mummy: "New contributors and AI agents follow the docs. Wrong docs mean wrong commands.",
  };
  return `${f.title} (${f.kind}, ${f.severity}).\n\n${f.message}\n\nWhy it matters: ${why[f.kind] ?? ""}\n\nWhat to do: ${f.fix}\n\nRisk in one sentence: ${f.blastRadius ?? (f.severity === "critical" ? "an attacker can act with your rights today." : "it gets worse the longer it stays.")}\n\n(Prepared demo answer: add your own key to ask a live model.)`;
}

/** Prepared attack path through the demo findings, citing real ids. */
export function demoAttackPath(findings: Finding[]): AttackPath {
  const by = (rule: string) => findings.find((f) => f.rule === rule)?.id;
  const steps = [
    { id: by("ci/unpinned-action"), how: "The attacker takes over the unpinned deploy action's main branch, so the next CI run executes their code." },
    { id: by("secret/github-token"), how: "Their code reads the GitHub token left in scripts/deploy.sh and pushes a change to the repo." },
    { id: by("spider/sql-concat"), how: "The pushed change is not even needed: the order endpoint already lets crafted ids read every order." },
    { id: by("secret/stripe-live-key"), how: "With the live Stripe key from history they issue refunds to cards they control." },
  ].filter((s): s is { id: string; how: string } => Boolean(s.id));
  return {
    title: "From a CI tag to refunds",
    steps,
    stop: "Pin the deploy action to a commit SHA and revoke the GitHub token: both break the chain at its first step.",
  };
}
