---
inclusion: always
---

# Tech stack and conventions

## Layout (target, pnpm workspaces)

```
apps/web          Next.js App Router, Tailwind, Vercel
packages/core     scanners, finding format, score, masking (pure TS, no I/O)
packages/github   GitHub REST client, rate limits, revocation call
packages/cli      watcher, pre-commit hook, local scan
packages/mcp      MCP server wrapping core
packages/sandbox  Vercel Sandbox runner, output parsers for test, build and crash logs
power/            Kiro Power: POWER.md, mcp.json, steering/
```

Current state: one Next.js app at the repo root. Moving to this layout is task 1 of `scanner-core`.

## Rules

- TypeScript `strict: true` and `noUncheckedIndexedAccess`. No `any` without a comment saying why.
- `packages/core` has no network or file access. Input text in, `Finding[]` out. Fully unit and property testable.
- Network lives only in `packages/github` (and OSV calls in the web app's scan route).
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
