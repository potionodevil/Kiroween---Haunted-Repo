# Design: Scanner

## Overview

```
POST /api/scan { repo }
  -> parseRepo()                      lib/github/parse.ts
  -> fetchCommits(300) + fetchDiffs   lib/github/history.ts
  -> fetchHeadFiles(200)              lib/github/tree.ts
  -> scanSecrets(diffs)      -> ghosts   lib/scanner/secrets/
  -> lintFiles(files)        -> zombies  lib/scanner/zombies/
  -> perfFiles(files)        -> bats     lib/scanner/bats/
  -> dedupe + sort + score            lib/scanner/index.ts
  <- ScanResult JSON
```

## Folder layout

```
app/
  page.tsx                  landing
  scan/[owner]/[repo]/page.tsx   haunted house
  exorcism/[id]/page.tsx    ritual
  hunt/page.tsx             live hunt
  api/scan/route.ts
lib/
  types.ts
  github/{client,parse,history,tree}.ts
  scanner/
    index.ts
    score.ts
    secrets/{rules,entropy,mask,scan}.ts
    zombies/{config,lint}.ts
    bats/{rules,scan}.ts
  demo/spooky-shop.ts       fake result for demo and offline dev
```

## Data model

```ts
interface ScanResult {
  repo: string;               // "owner/repo"
  defaultBranch: string;
  commitsScanned: number;
  filesScanned: number;
  durationMs: number;
  partial: boolean;
  findings: Finding[];
  score: number;
}

interface SecretRule {
  id: string;                 // "secret/aws-access-key"
  title: string;
  pattern: RegExp;            // must have one capture group = secret body
  severity: Severity;
  keepPrefix?: number;        // visible type prefix, e.g. 4 for "AKIA"
  fix: string;
}
```

GhostFinding adds: `firstSeen: { commit, date, file, line }`, `copies: { commit, file }[]`, `commitCount: number`.

## GitHub access

- REST API v3 with `Authorization: Bearer ${GITHUB_TOKEN}`.
- `GET /repos/{o}/{r}` -> default branch, private flag.
- `GET /repos/{o}/{r}/commits?per_page=100&page=1..3`.
- `GET /repos/{o}/{r}/commits/{sha}` -> `files[].patch` (diff). Fetched with a concurrency of 8.
- `GET /repos/{o}/{r}/git/trees/{branch}?recursive=1` -> filter JS/TS, then raw content via `raw.githubusercontent.com`.
- A global deadline (45 s) cancels outstanding requests via `AbortController` and sets `partial: true`.

## Secrets

- `scanSecrets(patch, meta)`: iterate added lines, run every rule, then entropy check.
- `shannonEntropy(s) = -Σ p·log2(p)`.
- `mask(secret, keepPrefix=0)`: prefix (max `keepPrefix`) + `•` × (len − prefix − 4, min 4) + last 4. Bodies shorter than 12 chars show 0 real body chars.
- Dedupe key: SHA-256 of the raw secret, computed and discarded inside the scanner; only the hash prefix is kept as id material.

## Zombies

- `new ESLint({ overrideConfigFile: true, overrideConfig: FIXED_CONFIG, fix: true })`.
- `lintText(source, { filePath })` per file, output `messages` and `output`.
- Patch = unified diff between `source` and `output` (package `diff`), only when `output` exists.

## Bats

- Parse with `@typescript-eslint/parser` (`parse(code, { jsx: true, loc: true })`).
- Simple recursive visitor. Rules are functions `(ast, source, file) => Finding[]`.

## Score

`score(findings, banished:Set<string>) = min(100, Σ w(severity))` for non-banished.

## Error handling

| Case | HTTP | Message |
|---|---|---|
| bad input | 400 | That does not look like a GitHub repo |
| private / missing | 404 | We can only see public repos |
| rate limit | 429 | GitHub needs a break. Try again at HH:MM |
| timeout | 200 | `partial: true` |

## Testing strategy

- Unit tests per rule (positive + negative).
- fast-check: `mask` never reveals > 4 body chars; every rule never throws on `fc.string()` / `fc.fullUnicodeString()`.
- Fixture test against `lib/demo/spooky-shop.ts`.
