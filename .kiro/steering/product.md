---
inclusion: always
---

# Product: Haunted Repo

Haunted Repo is a security and code health platform with a haunted house as its interface. It scans a GitHub repository, its history and its dependencies, and shows every problem as a creature. It explains each creature in plain language, fixes what can be fixed, and guards the repo from then on: in the editor through a Kiro Power, on the developer's machine through a watcher, and on GitHub through a pull request guardian. At the end the user exports an audit report.

## Creatures

| Creature | Finds | Sprite |
|---|---|---|
| Ghost | Secrets in current files and the last 300 commits | done |
| Vampire | Dependencies with known vulnerabilities (OSV.dev) | todo |
| Spider | Insecure code patterns (eval, innerHTML, SQL concat, …) | todo |
| Poltergeist | Unsafe CI and repo setup | todo |
| Zombie | Bugs (ESLint) | done |
| Bat | Performance problems | done |
| Skeleton | Architecture and stack-fit problems | todo |
| Mummy | Missing, outdated or weak documentation | todo |
| Possessed | Risks from AI agents and LLM code | todo |
| Banshee | Failures when the code actually runs (sandbox) | todo |

Severity: `critical`, `warning`, `low`. Findings carry a CWE id and an OWASP Top 10 category where one applies.

## Language rules

- Findings are "creatures". A repo "is haunted". Fixing is "banishing" or "laying to rest".
- Secrets are never auto-fixed; they are "exorcised" through the ritual.
- The Haunting score runs 0 to 100, lower is better. 0 = "The house is quiet".
- Playful headlines, plain and specific explanations. A developer understands the real risk in one read.
- Buttons say what happens: "Scan my repo", "Fix it now", "Banish token", "Export autopsy report".
- UI copy and code comments are English.

## Design rules

- Palette: plum night `#160E22` (background), crypt `#22172F` (surfaces), dust `#45345E` (lines), bone `#F3ECDD` (text, ghosts), lantern gold `#F2B544` (actions and critical only), spectral teal `#7FD6C9` (bats), zombie green `#9FD6A8` (zombies).
- Type: Pirata One display, Bricolage Grotesque text, JetBrains Mono only for code, paths and hashes.
- Creatures are 4-frame pixel sprite sheets animated with CSS `steps(4)`. Size shows severity: 100 %, 80 %, 60 %.
- One big motion moment per page. Everything else stays calm.
- Every creature is a real `<button>` with a full screen-reader label (kind, severity, title, location).
- All motion stops under `prefers-reduced-motion`.
- Text contrast at least 4.5:1. Lighthouse accessibility at least 95.
- Every headline feature is reachable in a few clicks from the landing page (3-minute demo video).
