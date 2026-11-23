# Haunted Repo — Devpost draft

## Inspiration
Deleting a leaked API key does not delete it. It stays in git history, and bots scrape public commits within minutes. We wanted a scanner people actually enjoy opening, so every problem became a creature in a haunted house.

## What it does
Haunted Repo scans a public GitHub repo: 300 commits of history, the current files and every lockfile. It finds ten kinds of creatures: ghosts (secrets), vampires (vulnerable dependencies via OSV), spiders (insecure code), poltergeists (unsafe CI), the possessed (AI-agent risks), zombies (bugs), bats (slow code), banshees (runtime failures), skeletons (architecture) and mummies (docs). Each finding has a severity, CWE and OWASP id, a plain explanation and a fix: a diff, a four-step exorcism ritual for secrets, or one-click revocation for leaked GitHub tokens.

It also guards the repo from then on: a pre-commit hook, a watcher that moves secrets from saved files into `.env.local`, and a Kiro Power with an MCP server so agents scan the code they write.

## How we built it
- Next.js on Vercel, a pnpm monorepo with a pure TypeScript core (no I/O) shared by the web app, the CLI and the MCP server.
- Secrets: own regex rules plus Shannon entropy, masked to four characters inside the scanner.
- Code creatures: one ESLint pipeline with our own rules and per-finding diffs from ESLint's fix data.
- Vampires: four lockfile formats and OSV.dev, with the smallest upgrade that fixes every advisory.
- AI medium: bring your own key (Anthropic, OpenAI, Mistral). The payload is shown before the first call; the key never leaves the tab.
- Pixel art: hand-made sprites and a four-layer villa for a CSS scroll-driven camera ride through the front door.

## How we used Kiro
- **Specs** for every area (scanner-core, scanners, creatures-ui, exorcism, ai-medium, watcher-cli, kiro-power, seance-room, autopsy-report, decoy-ghost), written as EARS requirements, then design, then tasks.
- **Steering**: `security.md` makes masking non-negotiable in every change; `product.md` keeps the creature language and design rules; `tech.md` holds the layout and limits.
- **Hooks**: Haunted Repo scans every saved file and checks the agent's work before it stops. Tests run on save.
- **MCP**: the project runs its own MCP server on itself.
- **Power**: `power/` ships the MCP server and secure-coding rules to any Kiro user.
- **Property-based tests** (fast-check) prove masking never reveals more than four characters, every scanner returns valid findings and never throws, the score never rises when you fix something, and the watcher's change plus undo restores files byte for byte.

## Challenges
Keeping raw secrets out of every output while still letting users revoke tokens (solved with a server-sealed handle), and fitting history, files and OSV into one 60-second serverless scan.

## What's next
A live sandbox for the séance room, a GitHub App for exorcism pull requests, and the PR guardian.
