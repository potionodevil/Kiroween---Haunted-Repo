# Design: Kiro Power

- `packages/mcp`: `@modelcontextprotocol/sdk` `McpServer.registerTool` with zod schemas over stdio. `local.ts` walks the tree (2000 files, 200 KB each); `remote.ts` scans GitHub (100 commits, OSV).
- `power/mcp.json` starts `npx -y haunted-repo mcp`; this repo uses `node packages/cli/dist/cli.js mcp` in `.kiro/settings/mcp.json`.
- Hooks for this repo: `.kiro/hooks/secret-check.json` (PostFileSave command and a Stop agent prompt) and `.kiro/hooks/test-on-save.json`.
