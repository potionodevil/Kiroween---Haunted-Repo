import { readFile } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  BLAST_RADIUS,
  SECRET_RULES,
  TEMPLATE_BY_RULE,
  autopsyMarkdown,
  buildRitual,
  parseRepo,
  scoreLabel,
  type Finding,
  type ScanResult,
} from "@haunted/core";
import { CODE_RULES, scanLocalFiles } from "@haunted/core/code";
import { insideRoot, readTree } from "./local";
import { scanGitHubRepo } from "./remote";

/** Short, masked text summary of a scan: what an agent reads first. */
export function summarize(r: ScanResult, limit = 25): string {
  const lines = [
    `Haunting score ${r.score}/100 (${scoreLabel(r.score)}), ${r.findings.length} findings in ${r.repo}.`,
    ...r.notes.map((n) => `Note: ${n}`),
    ...r.findings.slice(0, limit).map(
      (f) => `- [${f.severity}] ${f.kind} ${f.rule}: ${f.title} at ${f.file}${f.line ? `:${f.line}` : ""}${f.autoFixable ? " (auto-fixable)" : ""} | fix: ${f.fix}`,
    ),
  ];
  if (r.findings.length > limit) lines.push(`… ${r.findings.length - limit} more. Ask for the JSON or the autopsy report.`);
  return lines.join("\n");
}

function explain(rule: string): string {
  const secret = SECRET_RULES.find((r) => r.id === rule);
  if (secret) {
    const t = TEMPLATE_BY_RULE[rule];
    return [
      `${secret.title} (${rule}, ghost). ${secret.message}`,
      `If abused: ${BLAST_RADIUS[rule] ?? "depends on the service"}`,
      `Fix: ${secret.fix}`,
      t ? `Move the new key to ${t.envVar}. Rotation: ${t.rotate}` : "",
      "Deleting the line is not enough: the key stays in git history until rewritten (git filter-repo --replace-text).",
    ].filter(Boolean).join("\n");
  }
  const code = CODE_RULES[rule] ?? CODE_RULES[`haunted/${rule.replace("/", "-")}`];
  if (code) return `${code.title} (${rule}, ${code.kind}). Fix: ${code.fix}${code.cwe ? ` ${code.cwe}` : ""}${code.owasp ? ` OWASP ${code.owasp}` : ""}`;
  if (rule.startsWith("osv/")) return `Known vulnerability ${rule.slice(4)} in a dependency (vampire). Upgrade to the smallest fixed version; details at https://osv.dev/vulnerability/${rule.slice(4)}`;
  return `No built-in explanation for ${rule}. Scan the file and read the finding's message and fix fields.`;
}

export function createServer(root = process.cwd()): McpServer {
  const server = new McpServer({ name: "haunted-repo", version: "0.1.0" });

  server.registerTool(
    "scan_repo",
    {
      title: "Scan a GitHub repository",
      description: "Scans a public GitHub repo (history, current files, dependencies) and returns masked findings for all 10 creature kinds.",
      inputSchema: { repo: z.string().describe("owner/repo or https://github.com/owner/repo"), json: z.boolean().optional() },
    },
    async ({ repo, json }) => {
      const ref = parseRepo(repo);
      if (!ref) return { content: [{ type: "text", text: "That does not look like a GitHub repo." }], isError: true };
      const r = await scanGitHubRepo(ref);
      return { content: [{ type: "text", text: json ? JSON.stringify(r, null, 2) : summarize(r) }] };
    },
  );

  server.registerTool(
    "scan_directory",
    {
      title: "Scan the working tree",
      description: "Scans the local project (or a sub folder) offline: secrets, insecure code, bugs, slow code, CI, docs and architecture.",
      inputSchema: { path: z.string().optional().describe("Folder inside the workspace, default the workspace root"), json: z.boolean().optional() },
    },
    async ({ path, json }) => {
      const dir = insideRoot(root, path ?? ".");
      if (!dir) return { content: [{ type: "text", text: "Path is outside the workspace." }], isError: true };
      const tree = await readTree(dir);
      const { result } = scanLocalFiles(tree.files, { paths: tree.paths });
      return { content: [{ type: "text", text: json ? JSON.stringify(result, null, 2) : summarize(result) }] };
    },
  );

  server.registerTool(
    "scan_file",
    {
      title: "Scan one file",
      description: "Scans a single file by path (inside the workspace) or by content. Use it on every file an agent writes.",
      inputSchema: { path: z.string().optional(), content: z.string().optional(), filename: z.string().optional().describe("Name used with content, e.g. src/app.ts") },
    },
    async ({ path, content, filename }) => {
      let text = content;
      let name = filename ?? "snippet.ts";
      if (path) {
        const full = insideRoot(root, path);
        if (!full) return { content: [{ type: "text", text: "Path is outside the workspace." }], isError: true };
        text = await readFile(full, "utf8");
        name = path.replace(/\\/g, "/");
      }
      if (text === undefined) return { content: [{ type: "text", text: "Give a path or content." }], isError: true };
      const { result } = scanLocalFiles([{ path: name, content: text }], { paths: [name] });
      // single-file scans skip repo-level advice (missing README etc.)
      const own = result.findings.filter((f) => f.file === name);
      return { content: [{ type: "text", text: own.length ? summarize({ ...result, findings: own }) : `No creatures in ${name}.` }] };
    },
  );

  server.registerTool(
    "explain_finding",
    {
      title: "Explain a finding",
      description: "Plain-language explanation of a rule id such as secret/stripe-live-key, spider/sql-concat or osv/GHSA-xxxx.",
      inputSchema: { rule: z.string() },
    },
    async ({ rule }) => ({ content: [{ type: "text", text: explain(rule) }] }),
  );

  server.registerTool(
    "suggest_fix",
    {
      title: "Suggest fixes for a file",
      description: "Returns unified diffs for every auto-fixable finding in a file, plus the exorcism steps for secrets. Never applies anything.",
      inputSchema: { path: z.string() },
    },
    async ({ path }) => {
      const full = insideRoot(root, path);
      if (!full) return { content: [{ type: "text", text: "Path is outside the workspace." }], isError: true };
      const name = path.replace(/\\/g, "/");
      const { result } = scanLocalFiles([{ path: name, content: await readFile(full, "utf8") }], { paths: [name] });
      const own: Finding[] = result.findings.filter((f) => f.file === name);
      const parts = own.map((f) =>
        f.kind === "ghost"
          ? `## ${f.title} (${f.rule})\n${buildRitual(f).map((s, i) => `${i + 1}. ${s.title}: ${s.body}${s.command ? `\n\`\`\`\n${s.command}\n\`\`\`` : ""}`).join("\n")}`
          : `## ${f.title} (${f.rule}) line ${f.line ?? "?"}\n${f.fix}${f.patch ? `\n\`\`\`diff\n${f.patch}\`\`\`` : ""}`,
      );
      return { content: [{ type: "text", text: parts.length ? parts.join("\n\n") : `Nothing to fix in ${name}.` }] };
    },
  );

  server.registerTool(
    "autopsy_report",
    {
      title: "Autopsy report",
      description: "Markdown audit report of the working tree with severity, CWE, OWASP, location and fix for every finding.",
      inputSchema: {},
    },
    async () => {
      const tree = await readTree(root);
      const { result } = scanLocalFiles(tree.files, { paths: tree.paths });
      return { content: [{ type: "text", text: autopsyMarkdown(result) }] };
    },
  );

  return server;
}

export async function startStdioServer(root = process.cwd()): Promise<void> {
  const server = createServer(root);
  await server.connect(new StdioServerTransport());
}
