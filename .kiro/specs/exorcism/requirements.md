# Requirements: Exorcism ritual

## Introduction

A leaked secret cannot be "fixed" by a patch. Deleting the file does not remove it from git
history. The exorcism ritual guides the user through really getting rid of one secret.

## Requirement 1: Ghost overview

**User story:** As a developer, I want to see where my secret lives, so that I understand the damage.

1. The page SHALL show the ghost sprite, a severity badge, the title and the masked secret preview (max 4 real chars).
2. The page SHALL show a "Where it lives" timeline: born (first commit, date, file, line), each copy (commit, file), file deleted (date) if known, and "Still readable in N commits".
3. The page SHALL have a "Back to the haunted house" link.

## Requirement 2: Four steps

**User story:** As a developer, I want ready-made commands, so that I do not have to look up git filter-repo.

1. The page SHALL show 4 checkable steps:
   1. Roll the key at the provider (provider-specific text, e.g. Stripe dashboard path).
   2. Move the new key to an environment variable (code snippet for the detected language).
   3. Rewrite history (`git filter-repo --replace-text secrets.txt`, then `git push --force --all`, ask collaborators to re-clone).
   4. Keep it from coming back (install the Haunted Repo pre-commit hook).
2. Each command block SHALL have a "Copy" button.
3. The page SHALL show a progress bar and "N of 4 steps done".
4. Checked steps SHALL be remembered in `sessionStorage` for this repo and finding.
5. Step texts SHALL never contain the raw secret. `secrets.txt` content uses a placeholder the user fills in.

## Requirement 3: Confirm

1. WHEN the user clicks "Rescan to confirm it's gone" THEN the system SHALL rescan the repo and check whether the finding id still exists.
2. IF the ghost is gone THEN the page SHALL show "Laid to rest" and mark the finding banished.
3. IF the ghost is still there THEN the page SHALL show "Still haunting N commits" and which step is likely missing.
4. WHEN the user clicks "Mark as exorcised" on the house page THEN the finding SHALL be banished without rescan (user's responsibility).

## Requirement 4: Provider templates

1. The system SHALL have ritual templates for: AWS, Stripe, GitHub, Slack, Google, OpenAI-style, private key, generic.
2. Each template SHALL define: provider name, rotate instructions, env var name, code snippet.
