# Requirements: GitHub App login and auto-fix pull requests

1. WHEN the user clicks "Log in with GitHub" THEN the system SHALL start the GitHub App OAuth flow with a random state stored in an httpOnly cookie for 10 minutes.
2. WHEN GitHub calls back with a code and the matching state THEN the system SHALL exchange the code for a user token and store it only inside an AES-256-GCM sealed, httpOnly, secure, SameSite=Lax cookie that expires with the token (at most 8 hours).
3. The browser SHALL never receive the user token. `/api/auth/me` SHALL return only the login name and whether the user can push to a repo.
4. The `next` parameter SHALL only accept relative paths on this site (no `//host`, no `/\host`).
5. WHEN a scan result is returned THEN ghost values SHALL be stripped unless the logged-in user has push or admin access to the repo (security.md rule 8). The demo repo is exempt.
6. WHEN the user asks for a fix pull request THEN the system SHALL create a new branch `haunted-repo/exorcism-<date>-<id>`, commit only patches that still fit the current code, and open one pull request. It SHALL never write to the default branch.
7. Secrets (`secret/*` rules) SHALL never be part of an auto-fix pull request.
8. Every changed block SHALL get a `haunted-repo: <rule>` comment in the file's own comment syntax when the file type has one (JSON has none and stays unmarked).
9. WHEN the app is not installed on the repo THEN the system SHALL answer with the install link instead of an error code.
10. All POST routes SHALL reject cross-site requests (Origin check) and SHALL be rate limited per client.
