# 👻 Haunted Repo

**Your git history is haunted.** You deleted the API key months ago. It is still in a commit, waiting.
Haunted Repo scans a public GitHub repo and shows every problem as a creature you can banish.

| Creature | What it is |
|---|---|
| ![ghost](public/sprites/ghost_0.png) **Ghost** | A leaked secret somewhere in git history |
| ![zombie](public/sprites/zombie_0.png) **Zombie** | A bug found by the linter |
| ![bat](public/sprites/bat_0.png) **Bat** | Slow code: queries in loops, heavy imports, listener leaks |

Bigger creature, bigger risk. Fix them and the **Haunting score** drops.

> Kiroween 2026 · Costume Contest

## Status

Work in progress. See [`.kiro/specs`](.kiro/specs) for requirements, design and tasks.

## How Kiro is used

| Kiro feature | Where |
|---|---|
| Specs | `.kiro/specs/scanner`, `creatures-ui`, `exorcism` |
| Steering | `.kiro/steering/product.md`, `tech.md`, `security.md` |
| Hooks | `.kiro/hooks/test-on-save.kiro.hook`, `secret-check.kiro.hook` |
| Custom agent | `.kiro/agents/ghost-hunter.md` |

## Sprites

Hand-made pixel art, 4 frames per creature, 6× scale. Regenerate with:

```
pip install pillow
python tools/sprites/make.py
```

## Security

Secrets are masked to at most 4 visible characters and never stored. The demo repo uses fake keys only.

## License

MIT
