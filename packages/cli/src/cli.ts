import { watch } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { autopsyMarkdown, parseRepo, scoreLabel, type ScanResult } from "@haunted/core";
import { scanLocalFiles } from "@haunted/core/code";
import { readTree } from "@haunted/mcp/local";
import { scanGitHubRepo } from "@haunted/mcp/remote";
import { startStdioServer } from "@haunted/mcp";
import { BYPASS, installHook, stagedGhosts } from "./hook";
import { exorciseFile, undoBackup } from "./exorcise";

const c = {
  gold: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const HELP = `👻 haunted-repo — find and banish secrets, vulnerable deps, insecure code and more

Usage:
  haunted-repo scan [path]            Scan a working tree offline (default: .)
  haunted-repo scan owner/repo        Scan a public GitHub repo (uses GITHUB_TOKEN if set)
  haunted-repo report [path]          Print the autopsy report as Markdown
  haunted-repo install-hook           Block commits that add a secret
  haunted-repo pre-commit             Run the guard on staged changes (used by the hook)
  haunted-repo watch [--dry-run]      Move secrets out of files on save into .env.local
  haunted-repo undo <backup>          Restore a file the watcher changed
  haunted-repo mcp                    Start the MCP server (stdio) for Kiro and other agents

Options: --json  print JSON · --fail-on critical|warning|low  exit 1 at this severity (default critical)`;

function print(r: ScanResult) {
  console.log(`\n${c.bold(`Haunting score ${r.score}/100`)} ${c.dim(`(${scoreLabel(r.score)}) · ${r.filesScanned} files · ${r.findings.length} creatures`)}\n`);
  for (const f of r.findings.slice(0, 60)) {
    const sev = f.severity === "critical" ? c.red("critical") : f.severity === "warning" ? c.gold("warning ") : c.dim("low     ");
    console.log(`  ${sev} ${f.kind.padEnd(11)} ${f.title} ${c.dim(`${f.file}${f.line ? `:${f.line}` : ""}`)}`);
  }
  if (r.findings.length > 60) console.log(c.dim(`  … ${r.findings.length - 60} more (use --json)`));
  for (const n of r.notes) console.log(c.dim(`  note: ${n}`));
  console.log("");
}

const RANK = { critical: 3, warning: 2, low: 1 } as const;

async function main(argv: string[]): Promise<number> {
  const [cmd = "help", ...rest] = argv;
  const flags = new Set(rest.filter((a) => a.startsWith("--")));
  const args = rest.filter((a) => !a.startsWith("--"));
  const failOnArg = rest[rest.indexOf("--fail-on") + 1];
  const failOn = (failOnArg && failOnArg in RANK ? failOnArg : "critical") as keyof typeof RANK;
  const root = process.cwd();

  switch (cmd) {
    case "scan":
    case "report": {
      const target = args[0] ?? ".";
      const ref = /^[\w.-]+\/[\w.-]+$/.test(target) && !target.startsWith(".") ? parseRepo(target) : target.includes("github.com") ? parseRepo(target) : null;
      let result: ScanResult;
      if (ref) result = await scanGitHubRepo(ref);
      else {
        const tree = await readTree(resolve(root, target));
        result = scanLocalFiles(tree.files, { paths: tree.paths }).result;
      }
      if (cmd === "report") console.log(autopsyMarkdown(result));
      else if (flags.has("--json")) console.log(JSON.stringify(result, null, 2));
      else print(result);
      return result.findings.some((f) => RANK[f.severity] >= RANK[failOn]) ? 1 : 0;
    }
    case "install-hook":
    case "install-hooks":
      console.log(c.green(await installHook(root)));
      return 0;
    case "pre-commit": {
      if (process.env.HAUNTED_REPO_ALLOW_SECRET === "i-know-this-commits-a-secret") {
        console.log(c.gold("haunted-repo: guard bypassed on purpose."));
        return 0;
      }
      const ghosts = stagedGhosts(root);
      if (ghosts.length === 0) return 0;
      console.error(c.red(`\n👻 haunted-repo blocked this commit: ${ghosts.length} secret${ghosts.length === 1 ? "" : "s"} in staged changes.\n`));
      for (const g of ghosts) console.error(`  ${g.title} in ${g.file}:${g.line} ${c.dim(g.masked ?? "")}`);
      console.error(`\nMove the value to an environment variable (try ${c.bold("npx haunted-repo watch")}), then commit again.`);
      console.error(c.dim(`To commit anyway, type the bypass in full: ${BYPASS} git commit ...\n`));
      return 1;
    }
    case "watch": {
      const dry = flags.has("--dry-run");
      console.log(`${c.gold("👻 watching")} ${root} ${dry ? c.dim("(dry run: report only)") : ""}\n${c.dim("Saves are checked for secrets. Nothing leaves this machine. Ctrl+C to stop.")}`);
      const busy = new Set<string>();
      watch(root, { recursive: true }, (_e, name) => {
        if (!name) return;
        const rel = name.split(sep).join("/");
        if (/(^|\/)(node_modules|\.git|\.haunted|dist|\.next)\//.test(rel) || /(^|\/)\.env/.test(rel) || busy.has(rel)) return;
        busy.add(rel);
        setTimeout(async () => {
          try {
            const r = await exorciseFile(root, rel, { dryRun: dry });
            if (r) {
              console.log(`\n${c.red("ghost found")} in ${rel}: ${r.replaced.map((x) => x.envVar).join(", ")}`);
              console.log(r.diff);
              console.log(dry ? c.dim("dry run: nothing changed") : `${c.green("moved to .env.local")} · undo: ${c.bold(r.undo)}`);
            }
          } catch {
            /* file vanished or unreadable */
          } finally {
            setTimeout(() => busy.delete(rel), 500);
          }
        }, 150);
      });
      await new Promise(() => undefined);
      return 0;
    }
    case "undo": {
      if (!args[0]) {
        console.error("Give the backup path printed by the watcher.");
        return 2;
      }
      const rel = relative(root, resolve(root, args[0])).split(sep).join("/");
      console.log(c.green(`restored ${await undoBackup(root, rel)}`));
      return 0;
    }
    case "mcp":
      await startStdioServer(root);
      return await new Promise<number>(() => undefined);
    default:
      console.log(HELP);
      return cmd === "help" || cmd === "--help" ? 0 : 2;
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e: unknown) => {
    console.error(c.red(`haunted-repo: ${e instanceof Error ? e.message : String(e)}`));
    process.exit(2);
  },
);
