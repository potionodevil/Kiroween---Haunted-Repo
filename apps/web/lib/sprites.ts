import type { CreatureKind, Severity } from "@haunted/core";

export interface SpriteSheet {
  w: number;
  h: number;
  sheet: string;
}

/** Kinds with pixel art (public/sprites, 6x scale). Others render a placeholder. */
export const SPRITES: Partial<Record<CreatureKind, SpriteSheet>> = {
  ghost: { w: 96, h: 108, sheet: "/sprites/ghost_sheet.png" },
  zombie: { w: 96, h: 120, sheet: "/sprites/zombie_sheet.png" },
  bat: { w: 120, h: 72, sheet: "/sprites/bat_sheet.png" },
};

/** Size of the placeholder box at scale 1, close to the real sprites. */
export const PLACEHOLDER_SIZE = 100;

/** Creature size shows severity (product.md). */
export const SEVERITY_SCALE: Record<Severity, number> = { critical: 1, warning: 0.8, low: 0.6 };

export const KIND_LABEL: Record<CreatureKind, { one: string; many: string; meaning: string; hint: string; glyph: string }> = {
  ghost: { one: "Ghost", many: "Ghosts", meaning: "secret", hint: "keys and tokens in history", glyph: "G" },
  vampire: { one: "Vampire", many: "Vampires", meaning: "vulnerable dependency", hint: "packages with known holes", glyph: "V" },
  spider: { one: "Spider", many: "Spiders", meaning: "insecure code", hint: "eval, SQL strings, innerHTML", glyph: "S" },
  poltergeist: { one: "Poltergeist", many: "Poltergeists", meaning: "unsafe CI or setup", hint: "workflows and repo config", glyph: "P" },
  zombie: { one: "Zombie", many: "Zombies", meaning: "lint bug", hint: "linter errors and broken code", glyph: "Z" },
  bat: { one: "Bat", many: "Bats", meaning: "slow code", hint: "slow loops, heavy bundles, leaks", glyph: "B" },
  skeleton: { one: "Skeleton", many: "Skeletons", meaning: "architecture issue", hint: "structure and stack fit", glyph: "K" },
  mummy: { one: "Mummy", many: "Mummies", meaning: "weak docs", hint: "README, SECURITY, agent files", glyph: "M" },
  possessed: { one: "Possessed", many: "Possessed", meaning: "AI agent risk", hint: "LLM output, MCP configs, prompts", glyph: "X" },
  banshee: { one: "Banshee", many: "Banshees", meaning: "runtime failure", hint: "failing tests, crashes, build errors", glyph: "N" },
};

/** Accent color per kind for placeholders, from the steering palette. */
export const KIND_COLOR: Record<CreatureKind, string> = {
  ghost: "var(--color-bone)",
  vampire: "#e07a8a",
  spider: "#c9a7f0",
  poltergeist: "var(--color-teal)",
  zombie: "var(--color-zombie)",
  bat: "var(--color-teal)",
  skeleton: "var(--color-bone)",
  mummy: "#d9c9a0",
  possessed: "#b48cff",
  banshee: "#9fc4f0",
};

export const SEVERITY_LABEL: Record<Severity, string> = { critical: "Critical", warning: "Warning", low: "Low" };
