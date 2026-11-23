import type { CSSProperties } from "react";
import type { CreatureKind } from "@haunted/core";
import { Sprite } from "@/components/Sprite";

/**
 * Scroll-driven camera ride, CSS only (view-timeline in globals.css):
 * 1. the door opens, 2. the camera moves through it, 3. the hallway with walking creatures.
 * Without animation-timeline support or with reduced motion, only the static hallway shows.
 */
export function HouseRide() {
  return (
    <section aria-labelledby="ride-title" className="ride">
      <div className="ride-stage">
        <div className="ride-house-wrap" aria-hidden="true">
          <div className="ride-house">
            <svg viewBox="0 0 300 280" className="absolute inset-0 size-full">
              <rect x="215" y="20" width="30" height="80" fill="var(--color-crypt)" stroke="var(--color-dust)" strokeWidth="2" />
              <path d="M150 20 L290 120 L290 279 L10 279 L10 120 Z" fill="var(--color-crypt)" stroke="var(--color-dust)" strokeWidth="2" />
              <circle cx="150" cy="95" r="22" fill="#3a2a14" stroke="var(--color-lantern)" strokeWidth="2.5" />
              <rect x="35" y="150" width="45" height="60" rx="22" fill="#3a2a14" stroke="var(--color-lantern)" strokeWidth="2.5" />
              <rect x="220" y="150" width="45" height="55" rx="22" fill="var(--color-plum-night)" stroke="var(--color-dust)" strokeWidth="2" />
            </svg>
            {/* warm light behind the door, then the door itself */}
            <div className="ride-light" />
            <div className="ride-door" />
          </div>
        </div>

        <p className="ride-cap1 font-display">Step through the door</p>

        <div className="ride-hall">
          <div aria-hidden="true" className="absolute inset-0">
            <div className="absolute inset-x-0 top-1/2 h-px bg-dust" />
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-plum-night/50" />
            <div className="absolute left-[10%] top-[12%] h-[28%] w-[9%] rounded-t-full border border-dust bg-plum-night" />
            <div className="absolute right-[10%] top-[12%] h-[28%] w-[9%] rounded-t-full border border-dust bg-plum-night" />
            <div className="absolute left-[46%] top-[14%] h-[18%] w-[8%] rounded border border-lantern/70 bg-[#3a2a14]" />
            <Walker kind="ghost" bottom="52%" x0={12} x1={40} seconds={9} delay={0} />
            <Walker kind="zombie" bottom="52%" x0={55} x1={78} seconds={13} delay={-4} />
            <Walker kind="bat" top="8%" x0={30} x1={70} seconds={6} delay={-2} />
            <Walker kind="ghost" bottom="6%" x0={6} x1={30} seconds={11} delay={-6} />
            <Walker kind="zombie" bottom="6%" x0={40} x1={70} seconds={15} delay={-1} />
          </div>
          <div className="absolute inset-x-0 bottom-[18%] px-6 text-center">
            <h2 id="ride-title" className="font-display text-4xl sm:text-5xl">Something is already walking around</h2>
            <p className="mt-2 text-sm text-bone/70">Ghosts are leaked secrets. Zombies are bugs. Bats are slow code.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Walker({
  kind,
  x0,
  x1,
  seconds,
  delay,
  top,
  bottom,
}: {
  kind: CreatureKind;
  x0: number;
  x1: number;
  seconds: number;
  delay: number;
  top?: string;
  bottom?: string;
}) {
  const style = {
    top,
    bottom,
    left: `${x0}%`,
    "--x0": `${x0}%`,
    "--x1": `${x1}%`,
    "--d": `${seconds}s`,
    "--delay": `${delay}s`,
  } as CSSProperties;
  return (
    <div className="hunt-mover absolute" style={style}>
      <span className={kind === "zombie" ? "hunt-flip inline-block" : "inline-block"}>
        <Sprite kind={kind} scale={0.6} />
      </span>
    </div>
  );
}
