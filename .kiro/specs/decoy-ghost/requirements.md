# Requirements: decoy ghost, disclosure helper, token revocation (features 12, 22, 30)

1. WHEN a ghost is exorcised THEN the app SHALL offer a decoy: the user creates an AWS canary token at canarytokens.org; the app never creates tokens.
2. Decoys SHALL be registered by SHA-256 in `.haunted/decoys.json`, ignored by the scanner and shown as a note.
3. For repos the user has not proven to own, ghost values SHALL never be shown; the app SHALL draft a private report that points to private vulnerability reporting.
4. Leaked GitHub tokens SHALL be revocable through `POST /credentials/revoke` after an explicit confirmation that says it cannot be undone.
5. The raw token SHALL never reach the browser: only an AES-256-GCM sealed handle that the server can open.
