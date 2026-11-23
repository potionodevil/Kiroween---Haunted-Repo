# Tasks: Scanner

- [ ] 1. Project setup
  - [ ] 1.1 Next.js + TypeScript strict + Tailwind, Vitest + fast-check configured
  - [ ] 1.2 `lib/types.ts` with `Finding`, `ScanResult`, `Severity`, `CreatureKind`
  - _Requirements: 6, 7_

- [ ] 2. GitHub access
  - [ ] 2.1 `parseRepo()` with validation + tests (Req 1.1, 1.2)
  - [ ] 2.2 GitHub client with token, error mapping 404/429 (Req 1.3, 1.4)
  - [ ] 2.3 `fetchCommits` (max 300) + `fetchDiffs` with concurrency 8 and deadline (Req 2.1, 2.2, 2.5)
  - [ ] 2.4 `fetchHeadFiles` (max 200 JS/TS, skip > 200 KB) (Req 2.3, 2.4)

- [ ] 3. Ghosts
  - [ ] 3.1 `shannonEntropy` + tests
  - [ ] 3.2 `mask` + property test "never > 4 body chars" (Req 3.3, 7.2)
  - [ ] 3.3 10 secret rules, each with positive/negative test (Req 3.1)
  - [ ] 3.4 Entropy rule for suspicious assignments (Req 3.2)
  - [ ] 3.5 Dedupe across commits with firstSeen/copies/commitCount (Req 3.4)
  - [ ] 3.6 Severity logic incl. `test/example/dummy` downgrade (Req 3.5)
  - [ ] 3.7 Property test "no rule throws on random input" (Req 7.1)

- [ ] 4. Scan API
  - [ ] 4.1 `POST /api/scan` route handler, returns `ScanResult` (Req 1, 2)
  - [ ] 4.2 `lib/demo/spooky-shop.ts` fake result, `?demo=1` shortcut

- [ ] 5. Score
  - [ ] 5.1 `score()` + label + tests (Req 6)

- [ ] 6. Zombies
  - [ ] 6.1 Fixed ESLint config, `lintFiles()` (Req 4.1, 4.2)
  - [ ] 6.2 Severity mapping (Req 4.3)
  - [ ] 6.3 Patch via `eslint --fix` output diff (Req 4.4)

- [ ] 7. Bats
  - [ ] 7.1 AST parse helper
  - [ ] 7.2 `perf/query-in-loop`
  - [ ] 7.3 `perf/full-library-import` with auto-fix patch
  - [ ] 7.4 `perf/listener-leak`
  - _Requirements: 5_
