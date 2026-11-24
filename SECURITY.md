# Security policy

Haunted Repo handles leaked secrets, so we take reports seriously.

## Report a problem

Open a private report: GitHub → Security → **Report a vulnerability** on this repo.
Please do not open a public issue for security problems.

We answer within 7 days and fix confirmed issues as fast as we can.

## What we promise

- No raw secret leaves the scanner. Findings carry a masked value only.
- No secret, diff or user token is stored or logged.
- Your AI key stays in your browser tab's memory.
- Your GitHub login token stays in an encrypted httpOnly cookie.
- Sandboxes get no secrets and are destroyed after each run.

See `.kiro/steering/security.md` for the full rules.
