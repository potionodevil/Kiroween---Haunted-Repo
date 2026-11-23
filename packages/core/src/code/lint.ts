import { Linter } from "eslint";
import * as tsParser from "@typescript-eslint/parser";
import type { CreatureKind, Finding, Severity } from "../types";
import { stableId } from "../id";
import { HAUNTED_RULES } from "./rules";
import { applyFix, unifiedPatch } from "./patch";

interface RuleInfo {
  kind: CreatureKind;
  severity: Severity;
  title: string;
  fix: string;
  cwe?: string;
  owasp?: string;
}

/** Every rule the code pipeline runs, mapped to a creature. Built-in ESLint rules are the zombies. */
export const CODE_RULES: Record<string, RuleInfo> = {
  "haunted/spider-eval": { kind: "spider", severity: "critical", title: "Code built from strings", fix: "Remove eval and new Function. Parse data with JSON.parse or map inputs to known functions.", cwe: "CWE-95", owasp: "A03:2021" },
  "haunted/spider-inner-html": { kind: "spider", severity: "warning", title: "HTML from untrusted values", fix: "Use textContent, or sanitize with DOMPurify before inserting HTML.", cwe: "CWE-79", owasp: "A03:2021" },
  "haunted/spider-sql-concat": { kind: "spider", severity: "critical", title: "SQL built from input", fix: "Use a parameterized query: pass values separately, e.g. query('… WHERE id = $1', [id]).", cwe: "CWE-89", owasp: "A03:2021" },
  "haunted/spider-exec-input": { kind: "spider", severity: "critical", title: "Shell command built from values", fix: "Use execFile or spawn with an argument array, never a built command string.", cwe: "CWE-78", owasp: "A03:2021" },
  "haunted/spider-weak-hash": { kind: "spider", severity: "warning", title: "Weak hash", fix: "Use bcrypt, scrypt or argon2 for passwords, SHA-256 or better for signatures.", cwe: "CWE-328", owasp: "A02:2021" },
  "haunted/spider-tls-off": { kind: "spider", severity: "critical", title: "TLS checks switched off", fix: "Remove rejectUnauthorized: false. Add the right CA certificate instead.", cwe: "CWE-295", owasp: "A02:2021" },
  "haunted/spider-cors-wildcard": { kind: "spider", severity: "warning", title: "CORS * with credentials", fix: "List the allowed origins explicitly when credentials are sent.", cwe: "CWE-942", owasp: "A05:2021" },
  "haunted/bat-query-in-loop": { kind: "bat", severity: "warning", title: "Query in a loop", fix: "Load everything in one query (WHERE id IN (…)) or run the calls with Promise.all." },
  "haunted/bat-full-library-import": { kind: "bat", severity: "warning", title: "Heavy bundle import", fix: "Import only the functions you use, or use a smaller library." },
  "haunted/bat-listener-leak": { kind: "bat", severity: "low", title: "Listener never removed", fix: "Return a cleanup function from the effect that calls removeEventListener." },
  "haunted/bat-sequential-await": { kind: "bat", severity: "low", title: "Independent awaits in sequence", fix: "Start both calls together with Promise.all." },
  "haunted/possessed-llm-exec": { kind: "possessed", severity: "critical", title: "Model output runs as a command", fix: "Allow only a fixed list of actions and ask the user before running one.", cwe: "CWE-78", owasp: "A03:2021" },
  "haunted/possessed-prompt-injection": { kind: "possessed", severity: "warning", title: "User input inside a prompt", fix: "Keep instructions and user input in separate messages and mark the input as data.", cwe: "CWE-77", owasp: "A03:2021" },
  "haunted/zombie-floating-promise": { kind: "zombie", severity: "critical", title: "Unhandled promise", fix: "Add await inside a try/catch, or attach .catch() that reports the failure." },
  eqeqeq: { kind: "zombie", severity: "low", title: "Loose equality", fix: "Use === and !==." },
  "no-unused-vars": { kind: "zombie", severity: "warning", title: "Unused variable", fix: "Use it or remove it. An unused value often hints at a missing step." },
  "no-unreachable": { kind: "zombie", severity: "warning", title: "Unreachable code", fix: "Remove the dead code or move it before the return." },
  "no-dupe-keys": { kind: "zombie", severity: "warning", title: "Duplicate object key", fix: "The second key silently wins. Remove or rename one." },
  "no-self-compare": { kind: "zombie", severity: "warning", title: "Value compared with itself", fix: "Compare against the intended value; use Number.isNaN for NaN checks." },
  "use-isnan": { kind: "zombie", severity: "critical", title: "Broken NaN check", fix: "Use Number.isNaN(value)." },
  "valid-typeof": { kind: "zombie", severity: "critical", title: "Impossible typeof check", fix: "Fix the spelling of the type name." },
  "no-cond-assign": { kind: "zombie", severity: "warning", title: "Assignment inside a condition", fix: "Use === to compare, or move the assignment out of the condition." },
  "no-fallthrough": { kind: "zombie", severity: "warning", title: "Switch case falls through", fix: "Add break or return, or a // falls through comment if intended." },
  "no-unsafe-finally": { kind: "zombie", severity: "warning", title: "Return inside finally", fix: "Do not return or throw from finally; it swallows errors." },
  "no-constant-binary-expression": { kind: "zombie", severity: "warning", title: "Condition is always the same", fix: "Check operator precedence and parentheses." },
  "no-var": { kind: "zombie", severity: "low", title: "var instead of let/const", fix: "Use let or const." },
  "prefer-const": { kind: "zombie", severity: "low", title: "let that never changes", fix: "Use const." },
};

const BUILTIN_RULES = Object.keys(CODE_RULES).filter((r) => !r.startsWith("haunted/"));
const JS_ONLY = new Set(["no-unused-vars"]);
const MAX_PER_FILE = 15;
export const MAX_CODE_FINDINGS = 120;

let linter: Linter | null = null;
function getLinter(): Linter {
  linter ??= new Linter({ configType: "flat" });
  return linter;
}

function config(isTs: boolean): Linter.Config[] {
  const rules: Linter.RulesRecord = {};
  for (const r of Object.keys(CODE_RULES)) {
    if (isTs && JS_ONLY.has(r)) continue;
    rules[r] = r === "eqeqeq" ? ["warn", "smart"] : "warn";
  }
  return [
    {
      files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        parser: tsParser as unknown as Linter.Parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { haunted: { rules: HAUNTED_RULES } },
      rules,
      linterOptions: { reportUnusedDisableDirectives: "off" },
    },
  ];
}

export interface CodeFile {
  path: string;
  content: string;
}

/** Runs the shared ESLint pipeline over code files. Never throws; unparsable files are skipped. */
export function lintCode(files: CodeFile[]): { findings: Finding[]; skipped: number; truncated: boolean } {
  const out: Finding[] = [];
  let skipped = 0;
  for (const file of files) {
    const isTs = /\.(ts|tsx|mts|cts)$/i.test(file.path);
    let messages: Linter.LintMessage[];
    try {
      messages = getLinter().verify(file.content, config(isTs), { filename: file.path });
    } catch {
      skipped++;
      continue;
    }
    if (messages.some((m) => m.fatal || m.ruleId === null)) {
      skipped++;
      continue;
    }
    let perFile = 0;
    for (const m of messages) {
      const info = m.ruleId ? CODE_RULES[m.ruleId] : undefined;
      if (!info || perFile >= MAX_PER_FILE) continue;
      perFile++;
      // a direct fix, else ESLint's first suggestion (e.g. eqeqeq offers === only as a suggestion)
      const fix = m.fix ?? m.suggestions?.[0]?.fix;
      const patch = fix ? unifiedPatch(file.path, file.content, applyFix(file.content, fix)) : undefined;
      out.push({
        id: stableId(info.kind, [m.ruleId, file.path, m.line, m.column]),
        kind: info.kind,
        severity: info.severity,
        rule: m.ruleId!.replace(/^haunted\//, "").replace(/^(spider|bat|possessed|zombie)-/, "$1/"),
        cwe: info.cwe,
        owasp: info.owasp,
        title: info.title,
        file: file.path,
        line: m.line,
        message: m.message,
        fix: info.fix,
        autoFixable: Boolean(patch),
        patch,
      });
    }
  }
  const rank = { critical: 0, warning: 1, low: 2 } as const;
  out.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return { findings: out.slice(0, MAX_CODE_FINDINGS), skipped, truncated: out.length > MAX_CODE_FINDINGS };
}

export { BUILTIN_RULES };
