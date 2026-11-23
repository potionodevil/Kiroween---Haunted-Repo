# Requirements: seance room (features 26, 32, 33)

1. WHEN the user begins the seance THEN the system SHALL run install (lifecycle scripts off), build and tests in a sealed sandbox and stream the output.
2. A proof test SHALL fail before the fix and pass after it; the panel SHALL show both results.
3. A fix SHALL only be pushed when build and tests are at least as good after the fix.
4. The PR levels SHALL be suggest only, open a PR, and PR with auto-merge (off by default). The system SHALL never push to the default branch.
5. Sandboxes SHALL get no app secrets, no GitHub token and no AI key, and SHALL be destroyed after the run.
