import type { CreatureKind, Severity } from "@haunted/core";

/** Mirrors public/sprites/sprites.json (frame size at 6x scale). */
export const SPRITES: Record<CreatureKind, { w: number; h: number; sheet: string; still: string }> = {
  ghost: { w: 96, h: 108, sheet: "/sprites/ghost_sheet.png", still: "/sprites/ghost_0.png" },
  zombie: { w: 96, h: 120, sheet: "/sprites/zombie_sheet.png", still: "/sprites/zombie_0.png" },
  bat: { w: 120, h: 72, sheet: "/sprites/bat_sheet.png", still: "/sprites/bat_0.png" },
};

/** Creature size shows severity (product.md). */
export const SEVERITY_SCALE: Record<Severity, number> = { critical: 1, warning: 0.8, low: 0.6 };

export const KIND_LABEL: Record<CreatureKind, { one: string; many: string; meaning: string }> = {
  ghost: { one: "Ghost", many: "Ghosts", meaning: "secret" },
  zombie: { one: "Zombie", many: "Zombies", meaning: "lint bug" },
  bat: { one: "Bat", many: "Bats", meaning: "slow code" },
};

export const SEVERITY_LABEL: Record<Severity, string> = { critical: "Critical", warning: "Warning", low: "Low" };
