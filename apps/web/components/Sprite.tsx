import type { CSSProperties } from "react";
import type { CreatureKind } from "@haunted/core";
import { SPRITES } from "@/lib/sprites";

interface Props {
  kind: CreatureKind;
  /** Multiplier on the 6x base size. */
  scale?: number;
  paused?: boolean;
  className?: string;
}

/** Animated pixel sprite: 4-frame sheet stepped with CSS steps(4). Decorative; the parent carries the label. */
export function Sprite({ kind, scale = 1, paused = false, className = "" }: Props) {
  const s = SPRITES[kind];
  const style = {
    "--fw": `${Math.round(s.w * scale)}px`,
    "--fh": `${Math.round(s.h * scale)}px`,
    "--sheet": `url(${s.sheet})`,
    "--dur": kind === "bat" ? "0.45s" : "0.8s",
    animationPlayState: paused ? "paused" : undefined,
  } as CSSProperties;
  return <span aria-hidden="true" className={`sprite ${className}`} style={style} />;
}
