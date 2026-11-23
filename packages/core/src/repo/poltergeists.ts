import type { Finding } from "../types";
import { appendPatch, finding, has, lineOf, read, type RepoSnapshot } from "./snapshot";

const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const FIRST_PARTY = /^(actions|github)\//;
const SHA = /^[0-9a-f]{40}$/;

/** Unsafe CI and repo setup. Workflows are read as text; YAML structure is matched with line patterns. */
export function findPoltergeists(s: RepoSnapshot): Finding[] {
  const out: Finding[] = [];
  for (const path of s.paths.filter((p) => WORKFLOW.test(p))) {
    const text = read(s, path);
    if (!text) continue;

    if (/pull_request_target/.test(text)) {
      const m = /ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.(sha|ref)\s*\}\}/.exec(text);
      if (m) {
        out.push(
          finding("poltergeist", "critical", "ci/pr-target-checkout", "Unsafe pull_request_target", path,
            "The workflow runs on pull_request_target and checks out the pull request's code. Anyone can open a PR whose code then runs with your secrets and a write token.",
            "Use the pull_request trigger, or check out only the base branch in pull_request_target jobs.",
            { line: lineOf(text, m.index), cwe: "CWE-829", owasp: "A08:2021" }),
        );
      }
    }

    const inj = /run:[^\n]*\$\{\{\s*github\.event\.(issue|pull_request|comment|review)\.[a-z_.]*(title|body)[^}]*\}\}/.exec(text);
    if (inj) {
      out.push(
        finding("poltergeist", "critical", "ci/script-injection", "Issue or PR text runs in a shell", path,
          "A title or body from an issue or pull request is pasted into a shell step. Crafted text can run commands in your CI.",
          "Pass the value through an env variable (env: TITLE: ${{ … }}) and quote \"$TITLE\" in the script.",
          { line: lineOf(text, inj.index), cwe: "CWE-78", owasp: "A03:2021" }),
      );
    }

    const echo = /(echo|printf)[^\n]*\$\{\{\s*secrets\.[A-Za-z0-9_]+\s*\}\}/.exec(text);
    if (echo) {
      out.push(
        finding("poltergeist", "critical", "ci/secret-echo", "Secret printed to the log", path,
          "A secret is echoed in a run step. Masking fails as soon as the value is transformed, and logs are often public.",
          "Never print secrets. Pass them as env variables to the tool that needs them.",
          { line: lineOf(text, echo.index), cwe: "CWE-532", owasp: "A09:2021" }),
      );
    }

    const wa = /permissions:\s*write-all/.exec(text);
    if (wa) {
      out.push(
        finding("poltergeist", "warning", "ci/write-all", "Workflow token can write everything", path,
          "permissions: write-all gives every job a token that can push code, edit releases and change settings.",
          "Set permissions: contents: read at the top and grant more per job only where needed.",
          { line: lineOf(text, wa.index), cwe: "CWE-250", owasp: "A01:2021" }),
      );
    }

    const unpinned: { line: number; action: string }[] = [];
    for (const m of text.matchAll(/uses:\s*["']?([A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+)@([^\s"'#]+)/g)) {
      const [, action = "", ref = ""] = m;
      if (FIRST_PARTY.test(action) || SHA.test(ref) || action.startsWith("./")) continue;
      unpinned.push({ line: lineOf(text, m.index ?? 0), action: `${action}@${ref}` });
    }
    if (unpinned.length > 0) {
      out.push(
        finding("poltergeist", "warning", "ci/unpinned-action", `Action not pinned: ${unpinned[0]!.action}`, path,
          `${unpinned.length} third-party action${unpinned.length === 1 ? " is" : "s are"} referenced by a tag or branch. Whoever controls that tag controls your CI.`,
          "Pin each action to a full 40-character commit SHA and keep the tag as a comment.",
          { line: unpinned[0]!.line, cwe: "CWE-829", owasp: "A08:2021", evidence: unpinned.map((u) => `${path}:${u.line} ${u.action}`) }),
      );
    }
  }

  // .env handling
  const committedEnv = s.paths.filter((p) => /(^|\/)\.env(\.[a-z]+)?$/i.test(p) && !/\.(example|sample|template)$/i.test(p));
  const gitignore = read(s, ".gitignore");
  const ignoresEnv = gitignore !== undefined && /^\s*\.env\*?\s*$|^\s*\.env\.\*?\s*$|^\s*\*\.env\s*$/m.test(gitignore);
  if (committedEnv.length > 0) {
    out.push(
      finding("poltergeist", "warning", "repo/env-committed", "Env file committed", committedEnv[0]!,
        `${committedEnv.length} env file${committedEnv.length === 1 ? " is" : "s are"} in the repo. Env files usually hold secrets.`,
        "Delete the file from the repo, add .env* to .gitignore and rotate anything it contained.",
        { cwe: "CWE-538", owasp: "A05:2021", evidence: committedEnv }),
    );
  }
  if (!ignoresEnv && (committedEnv.length > 0 || has(s, /(^|\/)package\.json$/))) {
    out.push(
      finding("poltergeist", "low", "repo/env-not-ignored", ".env is not ignored", ".gitignore",
        "Nothing in .gitignore keeps .env files out of commits. The next secret is one git add away.",
        "Add .env* to .gitignore, with an exception for .env.example.",
        { patch: gitignore !== undefined ? appendPatch(".gitignore", gitignore, [".env*", "!.env.example"]) : `--- /dev/null\n+++ b/.gitignore\n@@ -0,0 +1,2 @@\n+.env*\n+!.env.example\n`, cwe: "CWE-538" }),
    );
  }

  // lockfile
  if (has(s, /^package\.json$/) && !has(s, /^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/)) {
    out.push(
      finding("poltergeist", "low", "repo/no-lockfile", "No lockfile", "package.json",
        "Without a lockfile every install can pull different versions, and vulnerable ones cannot be checked.",
        "Commit the lockfile your package manager creates (package-lock.json, pnpm-lock.yaml or yarn.lock).",
        { cwe: "CWE-1357", owasp: "A06:2021" }),
    );
  }
  return out;
}
