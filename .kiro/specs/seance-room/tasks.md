# Tasks: seance room

- [x] Seance UI with the prepared run, proof panel and PR levels
- [x] Vercel Sandbox runner: clone, install --ignore-scripts, network deny-all, build, test, NDJSON stream (`apps/web/lib/seance.ts`)
- [x] Only logged-in owners can start a live séance; output passes through redactLine
- [x] GitHub App for real pull requests (see github-app spec)
- [ ] Proof test and fix verified in the sandbox before the pull request

- [x] Fix PRs are tested before merge: after the PR opens, a séance runs on the fix branch (next/server after(), within maxDuration 300) and posts build and test results as a PR comment (apps/web/lib/verify.ts).
