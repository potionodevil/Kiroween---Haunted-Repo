---
inclusion: always
---

# Tech stack and conventions

## Stack

| Part | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript, Tailwind CSS |
| Scan API | Next.js Route Handler `app/api/scan/route.ts`, Node runtime |
| Secrets | Own regex rules + Shannon entropy in `lib/scanner/secrets/` (no dependency) |
| Linter | ESLint Node API with a fixed flat config in `lib/scanner/zombies/` |
| Performance | Own AST rules with `@typescript-eslint/parser` in `lib/scanner/bats/` |
| Sprites | PNG sheets in `public/sprites/`, animated with CSS `steps(4)` |
| 3D scroll | CSS `view-timeline` + `perspective`, no animation library |
| Tests | Vitest + fast-check (property-based) |
| Hosting | Vercel |

## Rules

- TypeScript `strict: true`. No `any` without a comment that explains why.
- All scanner code is pure and framework-free: input text in, `Finding[]` out.
  Network calls live only in `lib/github/`.
- Every rule has a unit test with one positive and one negative example,
  plus a fast-check property that it never throws on random input.
- One shared `Finding` type in `lib/types.ts`. UI never invents its own shape.
- Limits per scan: max 300 commits, max 200 JS/TS files at HEAD.
- `GITHUB_TOKEN` comes only from `process.env`. Never from the client.
- No client-side calls to the GitHub API.
- Prefer server components. Client components only for interaction (filters, panel, hunt).

## Finding format

```ts
export type CreatureKind = "ghost" | "zombie" | "bat";
export type Severity = "critical" | "warning" | "low";

export interface Finding {
  id: string;            // "f_<commit7>_<n>"
  kind: CreatureKind;
  severity: Severity;
  rule: string;          // "secret/aws-access-key"
  title: string;
  file: string;
  line: number;
  commit: string | null; // 7-char sha, null for HEAD-only findings
  message: string;
  fix: string;
  autoFixable: boolean;
  patch: string | null;  // unified diff
  secretPreview?: string; // masked, max 4 visible chars
}
```

## Commands

- `npm run dev` · `npm test` · `npm run lint` · `npm run build`
