import type { Finding } from "../types";
import { finding, has, lineOf, newFilePatch, read, type RepoSnapshot } from "./snapshot";

const README = /^readme(\.md|\.markdown|\.txt|\.rst)?$/i;
const ENV_NAME = /\b([A-Z][A-Z0-9]*_(?:[A-Z0-9]+_)*(?:KEY|TOKEN|SECRET|URL|URI|ID|PASSWORD|HOST|PORT|DSN))\b/g;
const SCRIPT_CMD = /\b(npm(?:\s+run)?|pnpm(?:\s+run)?|yarn(?:\s+run)?|bun\s+run)\s+([a-z][\w:-]*)/g;
const BUILTIN_CMDS = new Set(["install", "i", "ci", "add", "remove", "update", "init", "create", "dlx", "exec", "publish", "link", "x", "audit", "outdated", "why", "list", "ls"]);

export const SECURITY_TEMPLATE = (repo: string) => `# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems.
Use GitHub's private vulnerability reporting: https://github.com/${repo}/security/advisories/new

We answer within 7 days and credit reporters who want to be named.

## Supported versions

Only the latest release receives security fixes.
`;

/** Missing, outdated or wrong documentation. Every claim is checked against files in the repo. */
export function findMummies(s: RepoSnapshot, repo: string, codeText: string): Finding[] {
  const out: Finding[] = [];
  const readmePath = s.paths.find((p) => README.test(p));
  const readme = readmePath ? read(s, readmePath) : undefined;

  if (!readmePath) {
    out.push(
      finding("mummy", "warning", "docs/no-readme", "No README", "README.md",
        "The repo has no README. Nobody can tell what it does or how to start it.",
        "Add a README with what the project does, how to install it and how to run it."),
    );
  }

  const pkgText = read(s, "package.json");
  let scripts: Record<string, string> | undefined;
  let pkgLicense: string | undefined;
  try {
    const pkg = pkgText ? (JSON.parse(pkgText) as { scripts?: Record<string, string>; license?: string }) : undefined;
    scripts = pkg?.scripts;
    pkgLicense = pkg?.license;
  } catch {
    /* invalid package.json: other tools report that */
  }

  if (readme && readmePath && scripts) {
    for (const m of readme.matchAll(SCRIPT_CMD)) {
      const [whole, tool = "", name = ""] = m;
      const viaRun = /run$/.test(tool.trim());
      if (BUILTIN_CMDS.has(name) || (!viaRun && name === "test" && scripts.test)) continue;
      if (!viaRun && !["start", "test"].includes(name)) continue; // `npm foo` is not a script call
      if (scripts[name]) continue;
      const known = Object.keys(scripts).slice(0, 4).join(", ") || "none";
      out.push(
        finding("mummy", "low", "docs/readme-wrong-script", `README says ${whole.trim()}`, readmePath,
          `The README tells people to run \`${whole.trim()}\`, but package.json has no "${name}" script (it has: ${known}).`,
          `Change the README to a script that exists, or add "${name}" to package.json.`,
          { line: lineOf(readme, m.index ?? 0) }),
      );
      break;
    }
  }

  if (readme && readmePath) {
    const unknown = [...new Set([...readme.matchAll(ENV_NAME)].map((m) => m[1]!))].filter((n) => !codeText.includes(n)).slice(0, 5);
    if (unknown.length > 0) {
      const first = readme.indexOf(unknown[0]!);
      out.push(
        finding("mummy", "low", "docs/readme-unknown-env", "README lists env variables the code never reads", readmePath,
          `The README mentions ${unknown.join(", ")}, but no scanned code file reads ${unknown.length === 1 ? "it" : "them"}.`,
          "Remove the stale variables from the README or document the ones the code actually uses.",
          { line: lineOf(readme, first), evidence: unknown }),
      );
    }
    const broken: string[] = [];
    for (const m of readme.matchAll(/\]\((?!https?:|mailto:|#)([^)\s#]+)/g)) {
      const target = decodeURIComponent(m[1]!).replace(/^\.\//, "").replace(/\/$/, "");
      if (!target || s.paths.some((p) => p === target || p.startsWith(`${target}/`))) continue;
      broken.push(target);
    }
    if (broken.length > 0) {
      out.push(
        finding("mummy", "low", "docs/broken-link", "Broken links in the README", readmePath,
          `${broken.length} relative link${broken.length === 1 ? " points" : "s point"} to files that do not exist: ${broken.slice(0, 3).join(", ")}.`,
          "Fix the paths or remove the links.",
          { evidence: broken.slice(0, 10) }),
      );
    }
  }

  if (!has(s, /^LICEN[CS]E(\.[a-z]+)?$/i) && !pkgLicense) {
    out.push(
      finding("mummy", "low", "docs/no-license", "No license", "LICENSE",
        "Without a license nobody may legally use, copy or change the code.",
        "Add a LICENSE file, for example MIT, and set the license field in package.json."),
    );
  }

  if (!has(s, /^(\.github\/)?SECURITY\.md$/i)) {
    out.push(
      finding("mummy", "low", "docs/no-security-md", "No SECURITY.md", "SECURITY.md",
        "There is no SECURITY.md, so people who find a vulnerability do not know how to report it privately.",
        "Add a SECURITY.md that points to GitHub's private vulnerability reporting.",
        { patch: newFilePatch("SECURITY.md", SECURITY_TEMPLATE(repo)) }),
    );
  }

  if (!has(s, /^(AGENTS\.md|CLAUDE\.md|\.cursorrules|\.kiro\/steering\/)/)) {
    out.push(
      finding("mummy", "low", "docs/no-agent-instructions", "No agent instructions", "AGENTS.md",
        "No AGENTS.md, CLAUDE.md or .kiro/steering files. AI agents working on this repo guess the conventions.",
        "Add an AGENTS.md with the commands to install, test and build, and the rules agents must follow."),
    );
  }
  return out;
}
