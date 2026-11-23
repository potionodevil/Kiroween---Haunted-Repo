# Design: autopsy report

- `packages/core/src/report/report.ts`: `autopsyMarkdown`, `cycloneDx` and `badgeSvg` (pure, reused by the CLI and MCP server).
- `/report` page with print CSS; `/api/badge?repo=owner/name` or `?demo=1`.
