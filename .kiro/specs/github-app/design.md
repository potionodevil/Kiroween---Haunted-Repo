# Design: GitHub App login and auto-fix pull requests

## Flow

```
Log in ──> /api/auth/login ──> github.com/login/oauth/authorize
                                   │ code + state
                                   ▼
            /api/auth/callback ──> POST /login/oauth/access_token ──> GET /user
                                   │
                                   ▼
                     hr_session cookie (sealJson: AES-256-GCM)
```

## Parts

| Part | File | Job |
|---|---|---|
| Session | `apps/web/lib/auth.ts` | getSession, canPush (GET /repos with the user token), userApi |
| Cookie crypto | `apps/web/lib/seal.ts` | sealJson / unsealJson, key from HAUNTED_SEAL_KEY or GITHUB_CLIENT_SECRET |
| Routes | `apps/web/app/api/auth/*` | login, callback, me, logout |
| Patch engine | `packages/core/src/fix/apply.ts` | parsePatches, applyPatchText, commentFor (pure, property tested) |
| PR route | `apps/web/app/api/fix-pr/route.ts` | branch, one commit per file, pull request |
| Guards | `apps/web/lib/guard.ts` | sameOrigin, rateLimit |

## Environment

`GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY` (PR guardian, later), `GITHUB_WEBHOOK_SECRET` (PR guardian, later).

## App permissions

Metadata read, Contents write, Pull requests write, Checks write, Workflows write. User authorization during installation on.

## Why user tokens

A GitHub App user token can only touch repos where the app is installed AND the user has access. That is the ownership proof and the write limit in one.
