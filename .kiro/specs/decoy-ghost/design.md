# Design: decoy ghost and friends

- `components/exorcism/DecoyGhost.tsx`, `components/house/DisclosureDraft.tsx`, `components/house/RevokeToken.tsx`.
- `lib/seal.ts` (key from HAUNTED_SEAL_KEY or GITHUB_TOKEN) and `/api/revoke` (one call per client per minute, nothing logged); the scanner's `seal` hook in `LineContext`.
