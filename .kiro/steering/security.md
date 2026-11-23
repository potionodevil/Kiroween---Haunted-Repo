---
inclusion: always
---

# Security rules (non-negotiable)

Check these before writing or changing any code that touches findings, diffs, secrets, AI calls, the watcher or the sandbox. Add a test when a rule could break.

1. **No unmasked secret leaves the scanner module.** Ghosts travel with `masked` only (prefix + at most 4 real characters). Any surrounding code shown in the UI, the report, the PR guardian or an AI request has the value replaced by `<REDACTED>`.
2. **Never store secrets.** No database, log line, cache, analytics event or error report may contain a raw secret or a raw diff. Log counts and ids only.
3. **The user's AI key lives in memory for the current tab only.** Never localStorage, sessionStorage, cookies, logs, analytics or a server database.
4. **A server proxy, if needed for CORS, forwards and stores nothing.** A test proves request bodies are not logged.
5. **Before the first AI call, show exactly what will be sent.**
6. **AI patches are shown as diffs and never applied without a click.**
7. **No live verification of found keys against providers.** The only revocation is GitHub's own `POST /credentials/revoke` (feature 12), after explicit confirmation that explains it cannot be undone.
8. **Repos the user does not own** (feature 22): ghost values are never shown, not even masked; only the key type. Ownership is proven only by GitHub OAuth. The fake demo repo is exempt.
9. **The watcher never touches files outside the working tree** and always keeps a backup in `.haunted/backup/` before changing a file. It never sends anything over the network.
10. **Sandboxes get nothing from the app**: no environment variables, no GitHub token, no AI key. Egress is limited to package registries during install and blocked afterwards. Every sandbox is destroyed after the run.
11. **Install runs with lifecycle scripts disabled** (`--ignore-scripts`) unless the user explicitly allows them.
12. **Server-only GitHub token.** `GITHUB_TOKEN` is read from `process.env` on the server, never sent to the browser, never in a `NEXT_PUBLIC_` variable.
13. **Validate input.** Only `https://github.com/<owner>/<repo>` and `<owner>/<repo>`; owner and repo match `^[A-Za-z0-9_.-]{1,100}$`.
14. **Fake keys only.** Test fixtures build fake keys at runtime by string concatenation, so no literal key sits in this repo and GitHub push protection stays quiet. The demo repo uses random made-up values that belong to no account.
15. **This repo is scanned by its own scanner** before every commit (pre-commit guard) and on every file the agent writes (Kiro hook).
