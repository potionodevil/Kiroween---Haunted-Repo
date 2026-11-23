# Tasks: scanner-core (M1)

Done items come from the first build (single Next.js app, commits a8f5448..49337d0).

- [ ] 1. Monorepo
  - [ ] 1.1 pnpm workspaces (corepack), move app to `apps/web`, create `packages/core`, `packages/github`
  - [ ] 1.2 Move pure scanner code to `packages/core`, GitHub code to `packages/github`; all 55 tests still green
  - [ ] 1.3 Vercel root directory `apps/web`
- [ ] 2. Finding format v2 (R3)
  - [ ] 2.1 New `Finding` type with 10 kinds and optional fields; migrate UI and demo
  - [ ] 2.2 `stableId()` per design table + property test "same input, same id"
  - [ ] 2.3 `isValidFinding` guard + property "every scanner returns valid findings"
- [x] 3. Repo input and GitHub loading (R1, R2.2, R2.3)
- [ ] 4. Loading extensions (R2)
  - [ ] 4.1 Lockfiles and workflow files from the HEAD tree (R2.4, R2.5)
  - [ ] 4.2 60 s deadline + `notes[]` for partial results (R2.6)
- [x] 5. Ghost rules, entropy, masking, dedupe, severity (R4.1, R4.3, R4.4, R4.7)
- [ ] 6. Ghost extensions (R4)
  - [ ] 6.1 Scan HEAD text files too, merge with history hits (R4.2)
  - [ ] 6.2 "Deleted, still in history" (R4.5)
  - [ ] 6.3 Blast radius table + CWE/OWASP (R4.6)
  - [ ] 6.4 Owner-only masked view, type-only otherwise (R4.8)
- [ ] 7. Vampires (R5)
  - [ ] 7.1 Lockfile parsers: package-lock, pnpm, yarn v1, requirements (fixtures per format)
  - [ ] 7.2 OSV querybatch + details fetch with chunking and timeout
  - [ ] 7.3 `mapVampires`: severity from CVSS, references, CWE, OWASP
  - [ ] 7.4 `dependencyPath` and `minimalUpgrade`
  - [ ] 7.5 Vampire sprite (4 frames, same script)
- [x] 8. Haunting score (R6)
- [ ] 9. Result screen for 10 kinds (R7)
  - [ ] 9.1 Counters and filters only for kinds present; placeholder sprite for kinds without art
- [ ] 10. Demo with every creature type (R8)
- [x] 11. Exorcism ritual (R9)
- [ ] 12. First Vercel deployment with `GITHUB_TOKEN`
