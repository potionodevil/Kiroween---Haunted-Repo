# Requirements: Kiro Power and MCP server (feature 18)

1. The power SHALL follow the Agent Plugins layout: `plugin.json`, `mcp.json`, `skills/haunted-repo/SKILL.md`.
2. The MCP server SHALL expose `scan_repo`, `scan_directory`, `scan_file`, `explain_finding`, `suggest_fix` and `autopsy_report`.
3. Tools SHALL return masked values only and SHALL never apply changes.
4. File tools SHALL refuse paths outside the workspace.
5. The skill SHALL carry the secure-coding rules from security.md.
6. The docs SHALL say that Kiro file hooks fire on agent edits and that the watcher covers manual edits.
