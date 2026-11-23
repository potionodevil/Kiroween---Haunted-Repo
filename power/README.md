# power-haunted-repo

A Kiro Power that brings Haunted Repo into the editor.

| Part | File |
|---|---|
| Manifest | `plugin.json` |
| MCP server | `mcp.json` (runs `npx -y haunted-repo mcp`) |
| Skill with secure-coding rules | `skills/haunted-repo/SKILL.md` |

## Install

1. In Kiro, open the **Powers** panel.
2. Click **Add Custom Power**.
3. Pick **Import power from a repository URL** and paste `https://github.com/potionodevil/Kiroween---Haunted-Repo`, or pick **Import power from a folder** and choose this `power/` folder.
4. Click **Install**.

Optional: set `GITHUB_TOKEN` (read-only, public repos) in your environment so `scan_repo` is not rate limited.

## Tools

`scan_file`, `scan_directory`, `scan_repo`, `explain_finding`, `suggest_fix`, `autopsy_report`. All findings are masked; no tool applies changes.

## Hooks

Powers do not ship hooks. Copy `.kiro/hooks/secret-check.json` from this repo into your project to scan on every save and before the agent stops.
