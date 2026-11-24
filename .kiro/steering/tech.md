---
inclusion: always
---

# Tech stack and conventions

## Layout (pnpm workspaces)

```
apps/web          Next.js App Router, Tailwind, Vercel (Root Directory apps/web, build with webpack)
packages/core     scanners, finding format, score, masking, reports (pure TS, no I/O)
                  "@haunted/core/code" = node-only ESLint pipeline and local scan
packages/github   GitHub REST client, tree, history, raw files
packages/cli      npm "haunted-repo": scan, report, install-hook, pre-commit, watch, undo, mcp
packages/mcp      MCP server (6 tools) used by the CLI and the Kiro Power
power/            Kiro Power: plugin.json, mcp.json, skills/haunted-repo/SKILL.md
tools/            sprite and art generators (Python + Pillow)
```

The séance runner lives in `apps/web/lib/seance.ts` (Vercel Sandbox). GitHub App login in `apps/web/lib/auth.ts`.

## Rules

- TypeScript `strict: true` and `noUncheckedIndexedAccess`. No `any` without a comment saying why.
- `packages/core` has no network or file access. Input text in, `Finding[]` out. Fully unit and property testable.
- Network lives only in `packages/github`, the web app routes (scan, OSV, revoke, AI relay, auth, fix-pr, séance) and `packages/mcp/src/remote.ts`.
- AST parsing with `@typescript-eslint/parser`; ESLint Node API for zombies.
- Tests: Vitest + fast-check. Every rule has one positive and one negative example and is part of the "never throws on random input" property.
- One shared `Finding` type in `packages/core`. UI, report, CLI, MCP server and PR guardian only consume this shape.
- Scan limits: 300 commits, 200 JS/TS files, 60 seconds. Partial results carry `partial: true` and a note.
- Prefer server components. Client components only for interaction.

## Finding format

```ts
type CreatureKind = 'ghost' | 'vampire' | 'spider' | 'poltergeist' | 'zombie'
  | 'bat' | 'skeleton' | 'mummy' | 'possessed' | 'banshee';

type Finding = {
  id: string;                 // stable hash, see scanner-core design
  kind: CreatureKind;
  severity: 'critical' | 'warning' | 'low';
  rule: string;               // "secret/aws-access-key", "osv/GHSA-xxxx", "spider/sql-concat"
  cwe?: string;               // "CWE-798"
  owasp?: string;             // "A07:2021"
  title: string;
  file: string;
  line?: number;
  commit?: string;
  introducedAt?: string;
  fixedAt?: string;
  message: string;
  fix: string;
  blastRadius?: string;
  autoFixable: boolean;
  patch?: string;
  references?: string[];
  masked?: string;
  dependencyPath?: string[];
  minimalUpgrade?: string;
  proofTest?: string;
  confidence?: 'high' | 'medium' | 'low';
  evidence?: string[];
};
```

## Commands

`pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm build`
