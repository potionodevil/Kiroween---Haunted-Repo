"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { CREATURE_KINDS, sortFindings, type Finding } from "@haunted/core";
import type { GateContext } from "@/components/ScanGate";
import { useBanished } from "@/lib/client/useBanished";
import { scanQuery } from "@/lib/client/session";
import { KIND_LABEL, SEVERITY_LABEL } from "@/lib/sprites";
import { Sprite } from "@/components/Sprite";
import { LOOK, accessibleName, location } from "@/components/house/CreatureCard";
import { flies, laneFor } from "@/lib/motion";

/**
 * Lanes: flyers in the air above the wainscot, walkers with their feet on the floor boards
 * (the hall art puts the floor at 2/3 of the height, 347px of 520).
 */
const AIR = [
  { top: 40, dur: 18, delay: -9 },
  { top: 120, dur: 30, delay: -21 },
  { top: 80, dur: 26, delay: -14 },
  { top: 160, dur: 22, delay: -16 },
  { top: 60, dur: 34, delay: -3 },
  { top: 140, dur: 28, delay: -11 },
];
const GROUND = [
  { top: 262, dur: 26, delay: -3 },
  { top: 330, dur: 34, delay: -20 },
  { top: 296, dur: 30, delay: -14 },
  { top: 372, dur: 40, delay: -5 },
  { top: 280, dur: 36, delay: -27 },
  { top: 350, dur: 44, delay: -30 },
  { top: 312, dur: 50, delay: -12 },
];
const SPEEDS = [
  { label: "Slow", value: 0.6 },
  { label: "Normal", value: 1 },
  { label: "Fast", value: 1.7 },
];

export function HuntScene({ ctx }: { ctx: GateContext }) {
  const { result, demo, rescan } = ctx;
  const { banished, banish, reset } = useBanished(result.repo);
  const [speed, setSpeed] = useState(1);
  const q = scanQuery(result.repo, demo);

  const ordered = sortFindings(result.findings);
  const alive = ordered.filter((f) => !banished.has(f.id));
  const inScene = alive.slice(0, 13);
  const used = { air: 0, ground: 0 };
  const log = ordered.filter((f) => banished.has(f.id)).map((f) => f.title);
  const banishedCount = result.findings.length - alive.length;

  const action = (f: Finding) => (f.kind === "ghost" ? "banish it (then run the exorcism)" : f.kind === "banshee" ? "banish it (see the séance room)" : "apply the fix");

  const doRescan = async () => {
    reset();
    if (!demo) await rescan();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#160E22", color: "#F3ECDD" }}>
      <header style={{ borderBottom: "1px solid #33244A" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 32px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <Link href={`/house?${q}&cached=1`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#F3ECDD" }}>
            <span className="font-display" style={{ fontSize: 24 }}>Haunted Repo</span>
            <span className="font-mono" style={{ fontSize: 13, color: "#C2B6CF" }}>· live hunt</span>
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span className="font-mono" aria-live="polite" style={{ fontSize: 14, color: "#C2B6CF", background: "#22172F", border: "1px solid #33244A", borderRadius: 10, padding: "10px 14px" }}>
              {alive.length} left, {banishedCount} banished
            </span>
            <div role="group" aria-label="Speed" style={{ display: "flex", border: "1px solid #45345E", borderRadius: 10, overflow: "hidden" }}>
              {SPEEDS.map((s) => (
                <button key={s.label} type="button" aria-pressed={speed === s.value} onClick={() => setSpeed(s.value)} style={{ height: 42, padding: "0 12px", border: 0, fontSize: 13, cursor: "pointer", background: speed === s.value ? "#F3ECDD" : "transparent", color: speed === s.value ? "#160E22" : "#C2B6CF" }}>
                  {s.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void doRescan()} style={{ height: 44, padding: "0 16px", borderRadius: 10, border: "1px solid #45345E", background: "transparent", color: "#F3ECDD", fontSize: 15, cursor: "pointer" }}>
              Rescan
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 56px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 34, letterSpacing: -0.5 }}>Your repo is crawling with them</h1>
            <p style={{ margin: "8px 0 0", color: "#C2B6CF", fontSize: 16 }}>Hover a creature to freeze it and read the finding. Click to fix it and banish it.</p>
          </div>
          <span style={{ fontSize: 14, color: "#C2B6CF" }}>{new Set(result.findings.map((f) => f.kind)).size} kinds of creatures</span>
        </div>

        <section aria-label="Haunted hallway" style={{ marginTop: 22, position: "relative", height: 520, borderRadius: 22, overflow: "hidden", border: "1px solid #33244A", background: "#1C1229" }}>
          <div aria-hidden="true" className="hallbg" style={{ position: "absolute", inset: 0 }} />
          <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40, background: "linear-gradient(transparent,#160E22)" }} />

          {inScene.map((f, i) => {
            const lane = laneFor(f.kind, AIR, GROUND, used);
            const L = LOOK[f.severity];
            const pos: CSSProperties = { top: lane.top, animationDuration: `${(lane.dur / speed).toFixed(1)}s`, animationDelay: `${(lane.delay / speed).toFixed(1)}s` };
            const tip: CSSProperties = { textAlign: "left", background: "#22172F", border: `1px solid ${L.border}`, borderRadius: 12, padding: 14, boxShadow: "0 12px 30px rgba(0,0,0,.45)", ...(lane.top < 220 ? { bottom: "auto", top: "calc(100% + 10px)" } : {}) };
            return (
              <button key={f.id} type="button" className="hr-e" onClick={() => banish([f.id])} aria-label={`${accessibleName(f, false)}. ${f.fix} Press to ${action(f)}.`} style={pos}>
                <div className={flies(f.kind) ? "hr-wave" : undefined}>
                  <Sprite kind={f.kind} />
                </div>
                <div className="hr-tip" style={tip}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: L.bBg, color: L.bFg }}>{SEVERITY_LABEL[f.severity]}</span>
                    <span className="font-mono" style={{ fontSize: 11, color: "#9C8FAE" }}>{f.rule}</span>
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 700, fontSize: 15, color: "#F3ECDD" }}>{f.title}</div>
                  <div className="font-mono" style={{ marginTop: 4, fontSize: 12, color: "#C2B6CF" }}>{location(f)}</div>
                  <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: "#F3ECDD" }}>{f.fix}</div>
                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "#F2B544" }}>Click to {action(f)}</div>
                </div>
              </button>
            );
          })}

          {inScene.length === 0 && (
            <div role="status" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#160E22", textAlign: "center" }}>
              <div className="font-display" style={{ fontSize: 56, color: "#BDEBC5" }}>The house is quiet</div>
              <div style={{ color: "#C2B6CF", fontSize: 17 }}>All creatures banished. Haunting score 0 of 100.</div>
              <div style={{ color: "#9C8FAE", fontSize: 14 }}>Achievement unlocked: Exorcist, first class. Press Rescan if you miss them.</div>
            </div>
          )}
        </section>
        {alive.length > inScene.length && (
          <p style={{ margin: "10px 0 0", fontSize: 14, color: "#9C8FAE" }}>+{alive.length - inScene.length} more wait in the house. Banish some to let them in.</p>
        )}

        {log.length > 0 && (
          <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {log.slice(-12).map((l, i) => (
              <span key={`${l}-${i}`} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 20, background: "#16271B", border: "1px solid #6FA878", color: "#BDEBC5" }}>
                Banished · {l}
              </span>
            ))}
          </div>
        )}

        <h2 style={{ margin: "40px 0 14px", fontSize: 20 }}>The full bestiary, 4 frames each</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14 }}>
          {CREATURE_KINDS.map((k) => (
            <div key={k} className="bcard" style={{ background: "#22172F", border: "2px solid #33244A", borderRadius: 16, padding: 18, display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 70, height: 84, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <Sprite kind={k} scale={0.62} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{KIND_LABEL[k].one}</div>
                <div style={{ fontSize: 13, color: "#C2B6CF", marginTop: 2 }}>{KIND_LABEL[k].meaning}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
