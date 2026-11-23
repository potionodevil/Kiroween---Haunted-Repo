# Design: scanners

- `packages/core/src/vampires/{lockfiles,osv}.ts`: pure parsers and OSV mapping. Network lives in `apps/web/lib/osv.ts` with a 12 s budget inside the scan deadline.
- `packages/core/src/code/{rules,lint,patch,local}.ts`: ESLint 10 `Linter` with a flat config and `@typescript-eslint/parser` on TypeScript 5.9. Rules report; `lint.ts` maps rule ids to kind, severity, CWE, OWASP and fix text.
- The node-only entry `@haunted/core/code` keeps ESLint out of the browser bundle. Next lists eslint, the parser and typescript as server-external packages.
- `packages/core/src/repo/*.ts`: line-pattern scanners over a `RepoSnapshot` (all paths plus loaded text).
- Limits: 15 findings per file, 120 code findings per scan, a note when truncated.
