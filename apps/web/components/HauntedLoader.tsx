"use client";
import { useEffect, useState } from "react";
import { Sprite } from "@/components/Sprite";

/**
 * Loading screen: three creatures walk a candle-lit hallway while a terminal ticks off scan stages.
 * The stages follow elapsed time (the scan API sends no progress), so they stay honest: the last one waits.
 */
const STAGES = [
  "opening the front door",
  "walking through 300 commits",
  "reading every lockfile",
  "asking OSV about vampires",
  "listening for spiders in the code",
  "counting the creatures",
];
const AT = [0, 1.5, 5, 9, 14, 20];

export function HauntedLoader({ label, sub }: { label: string; sub?: string }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => setT((Date.now() - start) / 1000), 250);
    return () => window.clearInterval(id);
  }, []);
  const stage = AT.filter((a) => t >= a).length - 1;
  const pct = Math.min(95, Math.round((1 - Math.exp(-t / 14)) * 100));

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="loader-hall" aria-hidden="true">
        <div className="loader-walk" style={{ animationDelay: "0s" }}>
          <Sprite kind="ghost" scale={0.7} />
        </div>
        <div className="loader-walk" style={{ animationDelay: "-2.2s" }}>
          <Sprite kind="zombie" scale={0.7} />
        </div>
        <div className="loader-walk loader-fly" style={{ animationDelay: "-4.4s" }}>
          <Sprite kind="bat" scale={0.6} />
        </div>
        <div className="loader-floor" />
      </div>

      <div>
        <p role="status" className="text-lg">{label}</p>
        {sub && <p className="mt-1 text-sm text-bone/60">{sub}</p>}
      </div>

      <div className="font-mono" style={{ width: "min(460px, 92vw)", textAlign: "left", background: "#0F0918", border: "2px solid #33244A", borderRadius: 14, padding: "14px 16px", fontSize: 13, lineHeight: 1.8 }}>
        {STAGES.map((s, i) => (
          <div key={s} style={{ color: i < stage ? "#BDEBC5" : i === stage ? "#F2B544" : "#5A4D6E" }}>
            {i < stage ? "✔" : i === stage ? <span className="spin">◐</span> : "·"} {s}
            {i === stage && <span className="caret">▌</span>}
          </div>
        ))}
        <div aria-hidden="true" style={{ marginTop: 10, height: 6, borderRadius: 3, background: "#22172F", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#F2B544,#7FD6C9)", transition: "width .25s linear" }} />
        </div>
      </div>
    </main>
  );
}
