"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { CreatureKind, Finding } from "@haunted/core";
import type { GateContext } from "@/components/ScanGate";
import { useBanished } from "@/lib/client/useBanished";
import { scanQuery } from "@/lib/client/session";
import { sortFindings } from "@haunted/core";
import { KIND_LABEL, SEVERITY_LABEL, SEVERITY_SCALE, SPRITES } from "@/lib/sprites";
import { Sprite } from "@/components/Sprite";
import { accessibleName } from "@/components/house/CreatureCard";

const MAX_IN_SCENE = 12;
const SPEEDS = [
  { label: "Slow", value: 0.6 },
  { label: "Normal", value: 1 },
  { label: "Fast", value: 1.7 },
] as const;
const BASE_SECONDS: Record<CreatureKind, number> = {
  ghost: 10, vampire: 9, spider: 12, poltergeist: 8, zombie: 14,
  bat: 7, skeleton: 15, mummy: 16, possessed: 9, banshee: 8,
};
/** Flying kinds use the air lane; the rest walk on the floor. */
const AIR = new Set<CreatureKind>(["bat", "possessed", "banshee"]);

interface Placement {
  floor: 0 | 1;
  x0: number;
  x1: number;
  seconds: number;
  delay: number;
}

/** Deterministic lanes so the scene looks the same on every load. */
function place(f: Finding, i: number): Placement {
  const floor = (i % 2) as 0 | 1;
  const x0 = 3 + ((i * 17) % 28);
  const x1 = Math.min(82, x0 + 34 + ((i * 11) % 20));
  return { floor, x0, x1, seconds: BASE_SECONDS[f.kind] + (i % 3) * 1.5, delay: -((i * 2.3) % 9) };
}

export function HuntScene({ ctx }: { ctx: GateContext }) {
  const { result, demo, rescan } = ctx;
  const { banished, banish, reset } = useBanished(result.repo);
  const [frozen, setFrozen] = useState<string | null>(null);
  const [vanishing, setVanishing] = useState<Set<string>>(new Set());
  const [speed, setSpeed] = useState<number>(1);
  const q = scanQuery(result.repo, demo);

  const ordered = sortFindings(result.findings);
  const alive = ordered.filter((f) => !banished.has(f.id));
  const inScene = alive.slice(0, MAX_IN_SCENE);
  const overflow = alive.length - inScene.length;
  const banishedCount = result.findings.length - alive.length;

  const hit = (f: Finding) => {
    if (vanishing.has(f.id)) return;
    setVanishing((v) => new Set(v).add(f.id));
    setFrozen(null);
    setTimeout(() => {
      banish([f.id]);
      setVanishing((v) => {
        const n = new Set(v);
        n.delete(f.id);
        return n;
      });
    }, 450);
  };

  const doRescan = async () => {
    reset();
    await rescan();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-dust/60 py-5">
        <div className="flex items-baseline gap-2">
          <Link href={`/house?${q}&cached=1`} className="font-display text-2xl">Haunted Repo</Link>
          <span className="font-mono text-xs text-bone/60">· live hunt</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-dust px-3 py-2 font-mono text-xs text-bone/80" aria-live="polite">
            {alive.length} left · {banishedCount} banished
          </span>
          <div role="group" aria-label="Speed" className="flex overflow-hidden rounded-lg border border-dust">
            {SPEEDS.map((s) => (
              <button
                key={s.label}
                type="button"
                aria-pressed={speed === s.value}
                onClick={() => setSpeed(s.value)}
                className={`px-2.5 py-2 text-xs ${speed === s.value ? "bg-bone text-plum-night" : "text-bone/80 hover:bg-crypt"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void doRescan()} className="rounded-lg border border-dust px-3 py-2 text-sm hover:border-bone/50">
            Rescan
          </button>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Your repo is crawling with them</h1>
          <p className="text-sm text-bone/60">Hover a creature to freeze it and read the finding. Click to fix it and banish it.</p>
        </div>
        <p className="text-xs text-bone/60">Ghost · secret &nbsp; Zombie · lint bug &nbsp; Bat · performance</p>
      </div>

      <div
        className="hunt-scene relative mt-5 h-[460px] rounded-2xl border border-dust bg-crypt"
        style={{ "--speed": speed } as CSSProperties}
      >
        {/* house interior: two floors, doors and a lit painting */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-x-0 top-1/2 h-px bg-dust" />
          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-plum-night/45" />
          <div className="absolute left-[8%] top-[10%] h-[30%] w-[9%] rounded-t-full border border-dust bg-plum-night" />
          <div className="absolute right-[10%] top-[10%] h-[30%] w-[9%] rounded-t-full border border-dust bg-plum-night" />
          <div className="absolute left-[46%] top-[12%] h-[20%] w-[8%] rounded border border-lantern/70 bg-[#3a2a14]" />
        </div>

        {inScene.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <p className="font-display text-5xl">The house is quiet</p>
            <p className="text-bone/70">Every creature is banished.</p>
            <Link href={`/house?${q}&cached=1`} className="text-sm text-lantern underline underline-offset-4">Back to the haunted house</Link>
          </div>
        ) : (
          <ul className="absolute inset-0">
            {inScene.map((f, i) => (
              <Creature
                key={f.id}
                f={f}
                p={place(f, i)}
                frozen={frozen === f.id}
                vanishing={vanishing.has(f.id)}
                onFreeze={setFrozen}
                onHit={hit}
              />
            ))}
          </ul>
        )}
      </div>
      {overflow > 0 && (
        <p className="mt-2 text-sm text-bone/60">+{overflow} more creatures wait in the house. Banish some to let them in.</p>
      )}

      <section className="mt-12">
        <h2 className="font-semibold">Sprite sheets · 4 frames each</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(Object.entries(SPRITES) as [CreatureKind, NonNullable<(typeof SPRITES)[CreatureKind]>][]).map(([k, s]) => (
            <div key={k} className="flex items-center gap-4 rounded-2xl border border-dust bg-crypt p-4">
              <Sprite kind={k} scale={0.6} />
              <div>
                <div className="font-mono text-sm">{k}_sheet.png</div>
                <div className="font-mono text-xs text-bone/60">
                  {s.w} × {s.h} per frame · {k === "ghost" ? "float" : k === "zombie" ? "walk" : "flap"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Creature({
  f,
  p,
  frozen,
  vanishing,
  onFreeze,
  onHit,
}: {
  f: Finding;
  p: Placement;
  frozen: boolean;
  vanishing: boolean;
  onFreeze: (id: string | null) => void;
  onHit: (f: Finding) => void;
}) {
  const air = AIR.has(f.kind);
  const vertical: CSSProperties = air
    ? { top: p.floor === 0 ? "6%" : "56%" }
    : { bottom: p.floor === 0 ? "51%" : "3%" };
  const tooltipBelow = air || p.floor === 0;
  const style = {
    ...vertical,
    left: `${p.x0}%`,
    "--x0": `${p.x0}%`,
    "--x1": `${p.x1}%`,
    "--d": `calc(${p.seconds}s / var(--speed, 1))`,
    "--delay": `${p.delay}s`,
    zIndex: frozen ? 20 : undefined,
  } as CSSProperties;
  const playState = frozen || vanishing ? "paused" : "running";

  return (
    <li className="hunt-mover absolute" style={{ ...style, animationPlayState: playState }}>
      <button
        type="button"
        aria-label={`${accessibleName(f, false)}. Press to banish.`}
        onMouseEnter={() => onFreeze(f.id)}
        onMouseLeave={() => onFreeze(null)}
        onFocus={() => onFreeze(f.id)}
        onBlur={() => onFreeze(null)}
        onClick={() => onHit(f)}
        className={`relative block rounded-lg p-1 ${vanishing ? "hunt-vanish" : ""} ${frozen ? "ring-2 ring-lantern" : ""}`}
      >
        <span
          className={f.kind === "zombie" ? "hunt-flip inline-block" : "inline-block"}
          style={{ animationPlayState: playState }}
        >
          <Sprite kind={f.kind} scale={0.7 * SEVERITY_SCALE[f.severity]} paused={frozen || vanishing} />
        </span>
      </button>
      {frozen && !vanishing && (
        <div
          role="tooltip"
          className={`absolute left-1/2 z-30 w-64 -translate-x-1/2 rounded-xl border border-dust bg-plum-night p-3 text-left shadow-xl ${tooltipBelow ? "top-full mt-2" : "bottom-full mb-2"}`}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className={`rounded px-1.5 py-0.5 font-semibold ${f.severity === "critical" ? "bg-lantern text-plum-night" : "bg-dust"}`}>
              {SEVERITY_LABEL[f.severity]}
            </span>
            <span className="text-bone/70">{KIND_LABEL[f.kind].one}</span>
            <span className="truncate font-mono text-bone/55">{f.rule}</span>
          </div>
          <div className="mt-1.5 font-semibold">{f.title}</div>
          <div className="font-mono text-[11px] text-bone/60">{f.line ? `${f.file}:${f.line}` : f.file}</div>
          <div className="mt-1.5 text-xs text-bone/80">{f.fix}</div>
          <div className="mt-2 text-[11px] text-lantern">Click to banish</div>
        </div>
      )}
    </li>
  );
}
