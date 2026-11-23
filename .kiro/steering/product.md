---
inclusion: always
---

# Product: Haunted Repo

Haunted Repo scans a public GitHub repository and shows every problem as a creature.

| Creature | Meaning | Source | Color |
|---|---|---|---|
| Ghost | Leaked secret in git history | Own regex rules + Shannon entropy | Bone white `#F3ECDD` |
| Zombie | Bug / lint error | ESLint at HEAD | Zombie green `#9FD6A8` |
| Bat | Performance problem | Own AST rules | Ghost teal `#7FD6C9` |

## Language rules (UI copy)

- Findings are "creatures". A repo "is haunted". Fixing is "banishing" or "laying to rest".
- Secrets are never "fixed" automatically. They are "exorcised" through the ritual.
- The score is the "Haunting score", 0 to 100. Lower is better. 0 = "The house is quiet".
- Tone: playful in headlines, precise and plain in explanations and fix text.
  A developer must understand the real risk in one read.
- UI copy is English. Code comments are English.

## Screens

1. Landing page with scroll-driven camera ride through the front door.
2. Scan result: "the haunted house" (score, counters, filters, creature grid, detail panel).
3. Exorcism ritual for one secret (timeline, 4-step checklist, rescan).
4. Live hunt: creatures walk as sprites, hover freezes, click banishes.

## Design rules

- Creature size shows severity: critical 100 %, warning 80 %, low 60 %.
- Gold `#F2B544` is reserved for actions and critical findings. Nothing else.
- All motion stops under `prefers-reduced-motion: reduce`.
- Every creature is a real `<button>`, reachable by keyboard, with full screen-reader text
  (kind, severity, title, file, line).
- Text contrast is at least 4.5:1 on every surface.
- Fonts: Pirata One (display), Bricolage Grotesque (text), JetBrains Mono (code, paths, hashes only).

## Palette

| Token | Hex | Use |
|---|---|---|
| plum-night | `#160E22` | Background |
| crypt | `#22172F` | Surfaces |
| dust | `#45345E` | Lines |
| bone | `#F3ECDD` | Text, ghosts |
| lantern | `#F2B544` | Actions, critical |
| teal | `#7FD6C9` | Bats |
| zombie | `#9FD6A8` | Zombies |
