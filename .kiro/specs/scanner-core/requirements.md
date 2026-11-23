# Requirements: scanner-core (milestone M1)

## Introduction

M1 delivers the core platform: scan a public GitHub repo (features 1–4), find ghosts and vampires, show them in the haunted house with the Haunting score, run the exorcism ritual (feature 11), and offer a demo mode with every creature type. Everything else plugs into the finding format defined here.

Status markers: ✅ built in the current single-app code, 🔁 built but must change, ⬜ not built.

## R1 Accept a repository ✅

**User story:** As a developer, I want to paste a GitHub URL, so that I can scan without setup.

1. WHEN the user submits `https://github.com/<owner>/<repo>` or `<owner>/<repo>` THEN the system SHALL start a scan.
2. IF owner or repo do not match `^[A-Za-z0-9_.-]{1,100}$` THEN the system SHALL reject the input with "That does not look like a GitHub repo".
3. IF the repo is private or missing THEN the system SHALL respond 404 "We can only see public repos".
4. IF the GitHub rate limit is reached THEN the system SHALL respond 429 with the reset time.

## R2 Load the repository 🔁

**User story:** As a developer, I want history, current files and dependencies checked, so that nothing hides.

1. WHEN a scan starts THEN the system SHALL load the tree at HEAD of the default branch.
2. The system SHALL load at most the 300 most recent commits and scan only added lines of their diffs. ✅
3. The system SHALL load at most 200 JS/TS files from HEAD, skipping files over 200 KB, binaries, minified files and vendored folders. ✅
4. The system SHALL load every lockfile at HEAD: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `requirements.txt`. ⬜
5. The system SHALL load every workflow file under `.github/workflows/`. ⬜
6. The system SHALL stop all network work after 60 seconds and return what it has with `partial: true` and a note naming what was skipped. 🔁 (today 45 s, no note)

## R3 Finding format 🔁

1. Every scanner SHALL return findings in the shared `Finding` shape from `.kiro/steering/tech.md`.
2. Each finding SHALL have a stable `id` that stays the same across rescans of the same repo state.
3. Each finding SHALL carry a CWE id and an OWASP Top 10 category where one applies.
4. Every scanner SHALL return only valid findings and never throw on any input (property-based tested).

## R4 Ghosts (secrets) 🔁

**User story:** As a developer, I want leaked keys found in history and in current files, masked, so that I can rotate them safely.

1. The system SHALL apply at least 10 secret rules plus an entropy rule (≥ 4.0 bits/char, length ≥ 20, assigned to a key/secret/token/password name). ✅
2. The system SHALL scan both the 300 commit diffs and the current HEAD files of any text type up to 200 KB. 🔁 (today diffs only)
3. WHEN a secret is found THEN the system SHALL keep only `masked`: type prefix plus at most 4 real characters. ✅
4. WHEN the same secret appears in several commits or files THEN the system SHALL return one finding with `introducedAt`, `commit` of first appearance, copy locations in `evidence`, and the number of commits still containing it. ✅ (fields renamed)
5. WHEN a secret is present in history but absent at HEAD THEN the finding SHALL say so ("deleted, still in history").
6. Each ghost SHALL carry `blastRadius` from a static table per key type and `cwe: "CWE-798"`, `owasp: "A07:2021"`.
7. Severity: live production keys critical; test keys and unknown scope warning; values containing `test`, `example`, `dummy`, `fake`, `sample` low. ✅
8. IF the scan is not proven to be of the user's own repo THEN the UI SHALL show only the key type, never `masked` (feature 22). The demo repo is exempt.

## R5 Vampires (vulnerable dependencies) ⬜

**User story:** As a developer, I want to know which dependencies have known vulnerabilities and the smallest upgrade that fixes them.

1. The system SHALL parse resolved package versions from `package-lock.json` (v2/v3), `pnpm-lock.yaml`, `yarn.lock` (v1) and pinned `requirements.txt` lines.
2. The system SHALL query OSV.dev `POST /v1/querybatch` in chunks of at most 1000 packages, then fetch details for each returned vulnerability id.
3. Each vulnerable package version SHALL become one vampire finding with severity from CVSS (≥ 9 critical, ≥ 7 warning, else low; unknown = warning), `references`, `cwe` where OSV gives one, `owasp: "A06:2021"`.
4. The finding SHALL include `dependencyPath` (direct dependency → … → vulnerable package) where the lockfile shows it, and `minimalUpgrade`: the lowest fixed version in OSV's affected ranges that is above the installed one.
5. IF OSV is unreachable or slow THEN the scan SHALL still return other findings and mark vampires as skipped in the partial note.

## R6 Haunting score ✅

1. The score SHALL be `min(100, Σ weight)` over open findings with critical 20, warning 8, low 3.
2. Banishing a finding SHALL never raise the score (property-based tested).
3. Labels: 0 "The house is quiet", 1–29 "A little drafty", 30–69 "Haunted", 70–100 "Badly haunted".

## R7 Scan result screen ✅ (extend to 10 kinds)

1. The screen SHALL show score, a counter per creature kind present, filters with live counts, an animated sprite grid and a detail panel on hover, focus and click.
2. Creature kinds without a sprite yet SHALL fall back to a labeled placeholder sprite.

## R8 Demo mode 🔁

1. "Try a haunted demo repo" SHALL load a prepared scan with every creature type in under 2 seconds, without key or login. 🔁 (today 3 kinds)
2. The demo SHALL contain prepared AI answers for features in later milestones.

## R9 Exorcism ritual ✅

As specified in `.kiro/specs/exorcism`.
