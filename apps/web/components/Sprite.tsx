import type { CSSProperties } from "react";
import type { CreatureKind } from "@haunted/core";
import { KIND_COLOR, KIND_LABEL, PLACEHOLDER_SIZE, SPRITES } from "@/lib/sprites";

interface Props {
  kind: CreatureKind;
  /** Multiplier on the 6x base size. */
  scale?: number;
  paused?: boolean;
  className?: string;
}

/**
 * Animated pixel sprite: 4-frame sheet stepped with CSS steps(4).
 * Kinds without art yet get a framed letter placeholder that bobs gently.
 * Decorative: the parent carries the accessible label.
 */
export function Sprite({ kind, scale = 1, paused = false, className = "" }: Props) {
  const s = SPRITES[kind];
  if (!s) {
    const size = Math.round(PLACEHOLDER_SIZE * scale);
    const style = {
      width: size,
      height: size,
      color: KIND_COLOR[kind],
      borderColor: KIND_COLOR[kind],
      fontSize: Math.round(size * 0.55),
      animationPlayState: paused ? "paused" : undefined,
    } as CSSProperties;
    return (
      <span aria-hidden="true" className={`sprite-placeholder font-display ${className}`} style={style}>
        {KIND_LABEL[kind].glyph}
      </span>
    );
  }
  const style = {
    "--fw": `${Math.round(s.w * scale)}px`,
    "--fh": `${Math.round(s.h * scale)}px`,
    "--sheet": `url(${s.sheet})`,
    "--dur": kind === "bat" ? "0.45s" : "0.8s",
    animationPlayState: paused ? "paused" : undefined,
  } as CSSProperties;
  return <span aria-hidden="true" className={`sprite ${className}`} style={style} />;
}
