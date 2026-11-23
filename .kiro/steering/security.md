---
inclusion: always
---

# Security rules (non-negotiable)

1. **Always mask secrets.** A secret value never leaves `lib/scanner/secrets/` unmasked.
   The masked preview shows at most 4 real characters (the last 4), everything else is `•`.
   Known prefixes like `sk_live_` or `AKIA` may stay visible, because they name the type,
   not the secret. Prefix + last 4 is the maximum.
2. **Never store secrets.** No database, no log line, no cache, no analytics event
   may contain a raw secret. Scan results are kept in memory for the request only.
3. **Never log raw diffs.** Diffs can contain secrets. Log counts and ids only.
4. **Server-only token.** `GITHUB_TOKEN` is read on the server from `process.env`.
   It is never sent to the browser and never placed in a `NEXT_PUBLIC_` variable.
5. **Public repos only.** The scan endpoint rejects private or non-existent repos
   with a clear error. It never asks the user for a token in the MVP.
6. **Validate input.** Only `https://github.com/<owner>/<repo>` and `<owner>/<repo>` are accepted.
   Owner and repo match `^[A-Za-z0-9_.-]{1,100}$`.
7. **Demo data uses fake keys only.** Fake keys must be obviously fake
   (for example containing `EXAMPLE` or `FAKE`) and still match the rule pattern.
8. **This repo is scanned by its own scanner** before every commit (see hooks).

When writing or changing code that touches findings, diffs or secrets,
check these rules first and add a test if a rule could break.
