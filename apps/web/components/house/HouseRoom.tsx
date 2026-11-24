"use client";
import type { CSSProperties } from "react";
import type { Finding } from "@haunted/core";
import { KIND_COLOR, KIND_LABEL, SEVERITY_LABEL, SEVERITY_SCALE } from "@/lib/sprites";
import { flies, laneFor } from "@/lib/motion";
import { Sprite } from "@/components/Sprite";

/**
 * The room at the top of the house: this repo's creatures roam the hallway.
 * Flyers drift above the wainscot, walkers keep their feet on the floor boards.
 * Hover freezes one and shows its name; a click brings its card to the front.
 */
const AIR: CSSProperties[] = [
  { top: 18 }, { top: 70 }, { top: 40 }, { top: 96 }, { top: 8 },
].map((p, i) => ({ ...p, animationDuration: `${[22, 30, 26, 34, 19][i]}s`, animationDelay: `${[-3, -17, -9, -24, -12][i]}s` }));
const GROUND: CSSProperties[] = [
  { bottom: 20 }, { bottom: 64 }, { bottom: 6 }, { bottom: 44 }, { bottom: 84 }, { bottom: 30 }, { bottom: 10 },
].map((p, i) => ({ ...p, animationDuration: `${[34, 42, 28, 48, 38, 54, 31][i]}s`, animationDelay: `${[-5, -26, -14, -33, -8, -40, -19][i]}s` }));
const RANK = { critical: 0, warning: 1, low: 2 } as const;
const MAX = 12;

function pick(findings: Finding[]): Finding[] {
  const sorted = [...findings].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  const firstOfKind = sorted.filter((f, i) => sorted.findIndex((g) => g.kind === f.kind) === i);
  const rest = sorted.filter((f) => !firstOfKind.includes(f));
  return [...firstOfKind, ...rest].slice(0, MAX);
}

export function HouseRoom({ findings, total, onOpen }: { findings: Finding[]; total: number; onOpen: (f: Finding, from: DOMRect) => void }) {
  const shown = pick(findings);
  const used = { air: 0, ground: 0 };
  return (
    <section aria-label="The haunted hallway" className="house-room">
      <div aria-hidden="true" className="hallbg" style={{ position: "absolute", inset: 0 }} />
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36, background: "linear-gradient(transparent,#160E22cc)" }} />
      {shown.length === 0 && (
        <p className="font-display" style={{ position: "absolute", inset: 0, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>The house is quiet</p>
      )}
      {shown.map((f) => {
        const pos = laneFor(f.kind, AIR, GROUND, used);
        return (
          <button
            key={f.id}
            type="button"
            className="hr-e"
            style={{ ...pos, "--kc": KIND_COLOR[f.kind] } as CSSProperties}
            onClick={(e) => onOpen(f, e.currentTarget.getBoundingClientRect())}
            aria-label={`${KIND_LABEL[f.kind].one}, ${SEVERITY_LABEL[f.severity]}: ${f.title}. Open the card.`}
          >
            <div className={flies(f.kind) ? "hr-wave" : undefined}>
              <Sprite kind={f.kind} scale={SEVERITY_SCALE[f.severity] * 0.85} />
            </div>
            <span className="room-tag">
              <b style={{ color: KIND_COLOR[f.kind] }}>{KIND_LABEL[f.kind].one}</b> {f.title}
            </span>
          </button>
        );
      })}
      <span className="room-count font-mono">
        {shown.length} of {total} roaming · click one
      </span>
    </section>
  );
}
