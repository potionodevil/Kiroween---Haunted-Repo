import type { Finding } from "../types";
import { finding, lineOf, read, type RepoSnapshot } from "./snapshot";

const MCP_FILE = /(^|\/)(mcp\.json|claude_desktop_config\.json)$/;
const AGENT_FILE = /^(AGENTS\.md|CLAUDE\.md|\.cursorrules|\.github\/copilot-instructions\.md|\.kiro\/steering\/[^/]+\.md)$/;
const SHELL = /^(bash|sh|zsh|cmd(\.exe)?|powershell(\.exe)?|pwsh)$/i;
const TOKENISH = /^(gh[pousr]_|github_pat_|sk-|sk_live_|xox[baprs]-|AKIA|AIza|Bearer\s+\S{12,})/;
const UNSAFE_INSTRUCTION =
  /\b(skip|disable|ignore|bypass)\s+(the\s+|all\s+)?(tests?|linting|lint|checks?|hooks?|reviews?|ci)\b|--no-verify|\bpush\s+(directly\s+)?to\s+(main|master)\b|\bforce[- ]push\b|\bcommit\s+(the\s+)?(secrets?|\.env)\b|\brm\s+-rf\s+\//i;

function isPlaceholder(v: string): boolean {
  return /^\$\{|^\$[A-Z_]+|^<|^your|^xxx|^changeme$|^\s*$/i.test(v);
}

/** AI agent risks in configs and instruction files. Values are masked before they reach a finding. */
export function findPossessedConfigs(s: RepoSnapshot): Finding[] {
  const out: Finding[] = [];
  for (const path of s.paths.filter((p) => MCP_FILE.test(p))) {
    const text = read(s, path);
    if (!text) continue;
    let json: { mcpServers?: Record<string, { command?: string; env?: Record<string, unknown>; headers?: Record<string, unknown>; autoApprove?: unknown }> };
    try {
      json = JSON.parse(text);
    } catch {
      continue;
    }
    for (const [name, srv] of Object.entries(json.mcpServers ?? {})) {
      for (const [k, v] of Object.entries({ ...(srv?.env ?? {}), ...(srv?.headers ?? {}) })) {
        if (typeof v !== "string" || isPlaceholder(v)) continue;
        const looksSecret = TOKENISH.test(v) || (/(token|key|secret|password|authorization)/i.test(k) && v.length >= 12);
        if (!looksSecret) continue;
        const idx = text.indexOf(`"${k}"`);
        out.push(
          finding("possessed", TOKENISH.test(v) ? "critical" : "warning", "ai/mcp-hardcoded-token", "MCP config with a token", path,
            `The MCP server "${name}" has ${k} written into a committed config. Every clone of the repo gets the token.`,
            `Reference an environment variable instead ("${k}": "\${${k}}") and revoke the token.`,
            { line: idx >= 0 ? lineOf(text, idx) : undefined, cwe: "CWE-798", owasp: "A07:2021" }),
        );
      }
      const shell = srv?.command && SHELL.test(srv.command.split(/[\\/]/).pop() ?? "");
      const approveAll = Array.isArray(srv?.autoApprove) && (srv.autoApprove as unknown[]).includes("*");
      if (shell || approveAll) {
        const idx = text.indexOf(`"${name}"`);
        out.push(
          finding("possessed", "warning", "ai/mcp-broad-tool", "MCP tool can do anything", path,
            shell
              ? `The MCP server "${name}" starts a raw shell. An agent can run any command through it.`
              : `The MCP server "${name}" auto-approves every tool. No call ever asks you first.`,
            "Use a server with narrow tools and require confirmation for anything that writes or runs commands.",
            { line: idx >= 0 ? lineOf(text, idx) : undefined, cwe: "CWE-250", owasp: "A01:2021" }),
        );
      }
    }
  }

  for (const path of s.paths.filter((p) => AGENT_FILE.test(p))) {
    const text = read(s, path);
    if (!text) continue;
    const m = UNSAFE_INSTRUCTION.exec(text);
    if (m) {
      out.push(
        finding("possessed", "warning", "ai/unsafe-agent-instructions", "Agent told to skip safety checks", path,
          `The agent instructions say "${m[0]}". An agent will follow that, also when it hides a real problem.`,
          "Remove the instruction. Tell agents to run tests and hooks, and to open pull requests instead of pushing to main.",
          { line: lineOf(text, m.index), owasp: "A04:2021" }),
      );
    }
  }
  return out;
}
