---
name: haunted-repo
description: Use when writing, reviewing or committing code, when a key, token or password may be in a file, when adding dependencies, editing GitHub Actions or MCP configs, or when the user asks "is this repo safe", "scan my repo", "find secrets" or "audit". Scans with the Haunted Repo MCP tools and fixes findings safely.
---

# Haunted Repo

Haunted Repo shows every problem as a creature. Severity is critical, warning or low.

| Creature | Finds |
|---|---|
| Ghost | Secrets in files and git history |
| Vampire | Dependencies with known vulnerabilities (OSV) |
| Spider | Insecure code: SQL strings, eval, innerHTML, shell commands, TLS off |
| Poltergeist | Unsafe CI and repo setup |
| Possessed | AI agent risks: tokens in MCP configs, model output into a shell |
| Zombie | Bugs found by ESLint |
| Bat | Slow code: queries in loops, heavy imports, listener leaks |
| Banshee | Runtime failures (séance room, web app) |
| Skeleton | Architecture problems, always with evidence and confidence |
| Mummy | Docs that are missing or disagree with the code |

## Tools (MCP server `haunted-repo`)

- `scan_file` with `path`: run it on every file you create or change. Fix critical and warning findings before you finish.
- `scan_directory`: scan the whole workspace before a commit or a pull request.
- `scan_repo` with `repo` (`owner/name`): scan a public GitHub repo, including 100 commits of history and its dependencies.
- `explain_finding` with `rule`: plain explanation, blast radius and fix for a rule id.
- `suggest_fix` with `path`: unified diffs for auto-fixable findings and the exorcism steps for secrets. It never applies anything.
- `autopsy_report`: Markdown audit of the workspace.

## Rules you must follow

1. Never print, log, commit or send a raw secret. Use the masked value the tools return.
2. A secret in code is fixed by moving it to an environment variable and rotating it. Deleting the line is not enough: it stays in git history until rewritten with `git filter-repo --replace-text`.
3. Show diffs before applying them. Apply only after the user agrees.
4. Do not switch off checks, skip tests or use `--no-verify` to make a finding go away.
5. For a vampire, upgrade to the `minimalUpgrade` version, not to the newest major.
6. Skeleton and mummy findings are advice. Offer the "keep what you have" option the finding gives.

## Guard the repo

- `npx haunted-repo install-hook` blocks commits that add a secret.
- `npx haunted-repo watch` moves secrets out of saved files into `.env.local` and prints an undo command.
- Kiro file hooks fire on agent edits only. The watcher covers edits a person makes by hand.
