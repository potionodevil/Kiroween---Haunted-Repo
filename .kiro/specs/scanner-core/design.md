# Design: scanner-core (M1)

## Packages

```
packages/core     (pure, no I/O)
  src/types.ts              Finding, CreatureKind, ScanResult
  src/id.ts                 stableId()
  src/score.ts
  src/secrets/{rules,entropy,mask,scan,blast-radius}.ts
  src/vampires/{lockfiles,osv-map,upgrade}.ts   parse + map OSV JSON → Finding (no fetch)
  src/demo/haunted-demo.ts  every creature kind
packages/github   (network)
  src/{client,parse,history,tree,files}.ts
apps/web
  app/api/scan/route.ts     orchestrates github → core, plus OSV fetch
  app/, components/         current UI, moved as-is
```

`packages/core` must not import `node:fs`, `fetch` or `node:crypto`. Hashing uses a small pure SHA-256 (or `crypto.subtle` passed in by the caller) so core stays I/O free and runs in the CLI, the MCP server and the browser.

## Scan pipeline

```
POST /api/scan { repo }
  parseRepo → fetchRepo (default branch, private flag)
  parallel, one AbortController, 60 s deadline:
    a) commit shas (≤300) → diffs (concurrency 8)
    b) tree at HEAD → JS/TS files (≤200), text files for ghosts, lockfiles, workflows
  core.scanSecrets(diffs, headFiles)     → ghosts
  core.parseLockfiles(lockfiles)         → packages
  fetch OSV querybatch + vuln details    → core.mapVampires(packages, osv) → vampires
  sort, score → ScanResult { partial, notes[] }
```

## Stable ids

`id = "<kind-letter>_" + sha256(parts).slice(0, 12)` where parts are:

| Kind | Parts | Why |
|---|---|---|
| ghost | rule + sha256(secret value) | one secret spans many commits and files; rule + file + line + commit would split it |
| vampire | rule (osv id) + package name + installed version | one finding per vulnerable version |
| others | rule + file + line + commit | per the master prompt |

## Ghost details

- HEAD text files are scanned with `scanText`; diffs with `scanPatch`. Hits merge by secret hash.
- `introducedAt` = date of the oldest commit containing it. `evidence` = other `file@commit` copies.
- "Deleted, still in history" when no HEAD hit exists for that hash.
- `blastRadius` table, one plain sentence per rule (Stripe live: create charges and refunds, read customer data; AWS: whatever the IAM user may do, often S3 and EC2; GitHub token: read or push code within its scopes; …).
- Renames from the current code: `secretPreview → masked`, `ghost.firstSeen/copies/commitCount → commit, introducedAt, evidence, commitCount` (extra field kept in a `ghost` sub-object for the ritual timeline).

## Vampire details

- `package-lock.json` v2/v3: `packages["node_modules/a/node_modules/b"]` gives name, version and the nesting path → `dependencyPath`.
- `pnpm-lock.yaml`: needs a YAML parser (`yaml` package, in `apps/web`, core receives parsed objects) — `packages` keys `/name@version`; path from `importers` + `dependencies`.
- `yarn.lock` v1: small line parser in core; no path, direct deps from `package.json`.
- `requirements.txt`: only `name==version` lines; others are skipped and counted in the notes.
- OSV: `POST https://api.osv.dev/v1/querybatch` with `{queries:[{package:{name,ecosystem},version}]}` → ids; then `GET /v1/vulns/{id}` per unique id (concurrency 8, cached per id for the request).
- `minimalUpgrade`: from `affected[].ranges[].events` take every `fixed` greater than installed; pick the smallest by semver (npm) or PEP 440 order (PyPI, simplified: numeric segments).

## Partial results

`ScanResult.notes: string[]`, e.g. "Stopped after 60 s: 180 of 300 commits scanned", "OSV did not answer: vampires skipped", "12 requirements.txt lines not pinned: skipped".

## Testing

- Property: every scanner returns findings that pass a `isValidFinding` guard and never throws on random input.
- Property: masking never shows more than 4 body characters.
- Property: score is monotonic under banishing.
- Fixtures: small lockfile samples per format; recorded OSV JSON for 2 known advisories.
