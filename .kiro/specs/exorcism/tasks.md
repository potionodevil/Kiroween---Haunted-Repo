# Tasks: Exorcism ritual

- [ ] 1. Templates
  - [ ] 1.1 `RitualTemplate` for 8 providers (Req 4)
  - [ ] 1.2 `buildRitual()` + test "never contains raw secret" (Req 2.1, 2.5)

- [ ] 2. Page
  - [ ] 2.1 Route + load result from sessionStorage or rescan
  - [ ] 2.2 `GhostCard` + `Timeline` (Req 1)
  - [ ] 2.3 `StepList` with copy buttons and persisted checks (Req 2.2, 2.4)
  - [ ] 2.4 `ProgressBar` (Req 2.3)

- [ ] 3. Confirm
  - [ ] 3.1 Rescan and compare stable ghost id (Req 3.1–3.3)
  - [ ] 3.2 "Mark as exorcised" on house page (Req 3.4)

- [ ] 4. Guard
  - [ ] 4.1 `scripts/pre-commit.mjs` that runs the secret scanner on staged changes
