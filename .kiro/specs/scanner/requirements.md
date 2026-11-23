# Requirements: Scanner

## Introduction

The scanner takes a public GitHub repository, loads its history and HEAD files,
and returns a list of findings in one shared format. It finds three creature kinds:
ghosts (leaked secrets), zombies (lint bugs) and bats (performance problems).
It also computes the Haunting score.

## Requirement 1: Accept a repository

**User story:** As a developer, I want to paste a GitHub URL, so that I can scan my repo without setup.

### Acceptance criteria

1. WHEN the user submits `https://github.com/<owner>/<repo>` or `<owner>/<repo>` THEN the system SHALL start a scan for that repo.
2. IF owner or repo do not match `^[A-Za-z0-9_.-]{1,100}$` THEN the system SHALL reject the input with the message "That does not look like a GitHub repo".
3. IF the repo is private or does not exist THEN the system SHALL return HTTP 404 with the message "We can only see public repos".
4. IF the GitHub rate limit is reached THEN the system SHALL return HTTP 429 with the reset time.

## Requirement 2: Load history

**User story:** As a developer, I want deleted secrets to be found too, so that I know what is still in my history.

### Acceptance criteria

1. WHEN a scan starts THEN the system SHALL load at most 300 most recent commits of the default branch.
2. WHEN a commit is loaded THEN the system SHALL load its diff and scan only added lines (`+` lines).
3. WHEN a scan starts THEN the system SHALL load at most 200 JS/TS files (`.js .jsx .ts .tsx .mjs .cjs`) from HEAD.
4. The system SHALL skip files larger than 200 KB and binary files.
5. The system SHALL finish or return partial results with `partial: true` within 50 seconds.

## Requirement 3: Find ghosts (secrets)

**User story:** As a developer, I want leaked keys found and masked, so that I can rotate them safely.

### Acceptance criteria

1. The system SHALL include at least these 10 rules: AWS access key, AWS secret key, Stripe live key, Stripe test key, GitHub token, Slack token, Google API key, OpenAI-style API key, private key block, JWT secret / generic `*_SECRET=` assignment.
2. The system SHALL flag high-entropy strings (Shannon entropy ≥ 4.5 bits/char, length ≥ 20) that are assigned to a variable whose name contains `key`, `secret`, `token` or `password`.
3. WHEN a secret is found THEN the system SHALL store only a masked preview showing at most 4 real characters of the secret body.
4. WHEN the same secret appears in several commits THEN the system SHALL return one finding with `firstSeen`, `copies` and `commitCount`.
5. Severity: live production keys (AWS, Stripe live, GitHub, private key) SHALL be `critical`; test keys and tokens of unknown scope SHALL be `warning`; values containing `test`, `example`, `dummy` SHALL be `low`.
6. Ghost findings SHALL have `autoFixable: false`.

## Requirement 4: Find zombies (bugs)

**User story:** As a developer, I want real lint bugs shown, so that I can fix them quickly.

### Acceptance criteria

1. The system SHALL run ESLint with a fixed config over the HEAD files from Requirement 2.3.
2. The rule set SHALL include `no-unused-vars`, `eqeqeq`, `no-undef`, `@typescript-eslint/no-floating-promises`-like "unhandled promise" detection, `no-unreachable`, `no-dupe-keys`.
3. Severity: rules that can break runtime SHALL be `critical`; correctness smells `warning`; style `low`.
4. WHEN ESLint can fix the problem THEN the finding SHALL have `autoFixable: true` and a unified-diff `patch`.

## Requirement 5: Find bats (performance)

**User story:** As a developer, I want slow patterns found, so that my app stays fast.

### Acceptance criteria

1. The system SHALL include these rules: `perf/query-in-loop` (await of a db/fetch call inside a loop), `perf/full-library-import` (`import _ from "lodash"`, `import moment`), `perf/listener-leak` (`addEventListener` in a React effect without matching `removeEventListener`), `perf/sync-fs-in-handler` (optional).
2. WHEN a bat has a safe mechanical fix (e.g. per-method import) THEN it SHALL have `autoFixable: true` and a `patch`.

## Requirement 6: Haunting score

### Acceptance criteria

1. The system SHALL compute the score as `min(100, Σ weight)` with weights critical = 20, warning = 8, low = 3, counting only findings that are not banished.
2. WHEN a finding is banished THEN the score SHALL drop immediately in the UI without a new scan.
3. Score labels: 0 "The house is quiet", 1–29 "A little drafty", 30–69 "Haunted", 70–100 "Badly haunted".

## Requirement 7: Robustness

1. No rule SHALL throw on any input string (property-based tested).
2. Masking SHALL never reveal more than 4 characters of the secret body (property-based tested).
