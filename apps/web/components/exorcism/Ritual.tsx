"use client";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { buildRitual, type StepId } from "@haunted/core";
import type { GateContext } from "@/components/ScanGate";
import { loadSteps, saveSteps, scanQuery } from "@/lib/client/session";
import { useBanished } from "@/lib/client/useBanished";
import { Sprite } from "@/components/Sprite";
import { CopyButton } from "@/components/house/CopyButton";
import { SEVERITY_LABEL } from "@/lib/sprites";
import { DecoyGhost } from "./DecoyGhost";

type Check = { state: "idle" } | { state: "checking" } | { state: "gone" } | { state: "still"; commits: number };

const MUTED = "#C2B6CF";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "an unknown date";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function Ritual({ id, ctx }: { id: string; ctx: GateContext }) {
  const { result, demo, rescan } = ctx;
  const q = scanQuery(result.repo, demo);
  const back = `/house?${q}&cached=1`;
  const ghost = result.findings.find((f) => f.id === id && f.kind === "ghost");
  const { banished, banish } = useBanished(result.repo);
  const [done, setDone] = useState<Set<StepId>>(new Set());
  const [check, setCheck] = useState<Check>({ state: "idle" });

  useEffect(() => {
    setDone(loadSteps(result.repo, id) as Set<StepId>);
  }, [result.repo, id]);

  if (!ghost) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 18 }}>This creature needs no ritual. Only ghosts (leaked secrets) do.</p>
        <Link href={back} style={{ display: "inline-block", marginTop: 24, color: "#F2B544" }}>Back to the haunted house</Link>
      </main>
    );
  }

  const steps = buildRitual(ghost);
  const laid = banished.has(ghost.id) || check.state === "gone";
  const commits = ghost.ghost?.commitCount ?? 1;
  const hp = laid ? 0 : Math.round(commits * (1 - done.size / steps.length));
  const boss = result.findings.filter((f) => f.kind === "ghost").sort((a, b) => (b.ghost?.commitCount ?? 0) - (a.ghost?.commitCount ?? 0))[0];
  const isBoss = boss?.id === ghost.id;

  const toggle = (step: StepId) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      saveSteps(result.repo, id, next);
      return next;
    });
  };

  const confirm = async () => {
    setCheck({ state: "checking" });
    if (demo) {
      // The demo repo cannot really change: the rescan is simulated and succeeds once all 4 steps are ticked.
      await new Promise((r) => setTimeout(r, 1200));
      if (done.size === steps.length) {
        banish([ghost.id]);
        setCheck({ state: "gone" });
      } else setCheck({ state: "still", commits });
      return;
    }
    const fresh = await rescan();
    const still = fresh?.findings.find((f) => f.id === ghost.id);
    if (fresh && !still) {
      banish([ghost.id]);
      setCheck({ state: "gone" });
    } else setCheck({ state: "still", commits: still?.ghost?.commitCount ?? commits });
  };

  const missing = steps.find((s) => !done.has(s.id));
  const g = ghost.ghost;
  const mono: CSSProperties = { fontSize: 13, color: MUTED, marginTop: 4 };
  const dot = (gold: boolean): CSSProperties => ({ position: "absolute", left: -7, top: 4, width: 12, height: 12, borderRadius: 6, background: gold ? "#F2B544" : "#45345E" });

  return (
    <div style={{ minHeight: "100vh", background: "#160E22", color: "#F3ECDD" }}>
      <header style={{ borderBottom: "1px solid #33244A" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 32px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <Link href={back} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: MUTED, fontSize: 15 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to the haunted house
          </Link>
          <span className="font-display" style={{ fontSize: 24 }}>Haunted Repo</span>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 32px 64px", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
        <section style={{ flex: "1 1 360px", minWidth: 0 }}>
          <div className="wp" style={{ border: "6px double #AA7C36", borderRadius: 10, padding: 32, textAlign: "center", boxShadow: "inset 0 0 60px #160E22" }}>
            <div style={{ height: 170, display: "flex", alignItems: "flex-end", justifyContent: "center", opacity: laid ? 0.25 : 1, transition: "opacity .6s" }}>
              <Sprite kind="ghost" scale={1.5} paused={laid} />
            </div>
            <div style={{ marginTop: 16, display: "inline-block", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: laid ? "#16271B" : ghost.severity === "critical" ? "#F2B544" : "#45345E", color: laid ? "#BDEBC5" : ghost.severity === "critical" ? "#241604" : "#F3ECDD" }}>
              {laid ? "Laid to rest" : `${SEVERITY_LABEL[ghost.severity]} ghost`}
            </div>
            <h1 style={{ margin: "14px 0 0", fontSize: 32 }}>{ghost.title}</h1>
            <div className="font-mono" style={{ marginTop: 14, fontSize: 15, background: "#160E22", border: "1px solid #45345E", borderRadius: 10, padding: 12 }}>
              {demo && ghost.masked ? ghost.masked : "Value hidden: not proven to be your repo"}
            </div>
            {isBoss && (
              <div style={{ marginTop: 18, textAlign: "left" }} aria-label={`Boss hit points: ${hp} of ${commits}`}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: MUTED }}>
                  <span style={{ fontWeight: 800, color: "#F2B544" }}>Boss fight</span>
                  <span>
                    {hp} / {commits} HP
                  </span>
                </div>
                <div style={{ marginTop: 6, height: 12, borderRadius: 6, background: "#33244A", overflow: "hidden", border: "1px solid #45345E" }}>
                  <div style={{ height: "100%", width: `${(hp / commits) * 100}%`, background: "linear-gradient(90deg,#C8464A,#F2B544)", transition: "width .6s" }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#9C8FAE" }}>HP are the commits that still hold the key. Every ritual step drains them.</div>
              </div>
            )}
          </div>

          {g && (
            <>
              <h2 style={{ margin: "32px 0 14px", fontSize: 20 }}>Where it lives</h2>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", borderLeft: "2px solid #45345E" }}>
                <li style={{ padding: "0 0 18px 20px", position: "relative" }}>
                  <span style={dot(true)} />
                  <div style={{ fontWeight: 700 }}>Born on {fmtDate(g.firstSeen.date)}</div>
                  <div className="font-mono" style={mono}>
                    {g.firstSeen.commit} · {g.firstSeen.file}:{g.firstSeen.line}
                  </div>
                </li>
                {g.copies.map((c) => (
                  <li key={`${c.commit}-${c.file}`} style={{ padding: "0 0 18px 20px", position: "relative" }}>
                    <span style={dot(false)} />
                    <div style={{ fontWeight: 700 }}>{c.date ? `Copied on ${fmtDate(c.date)}` : "Copied"}</div>
                    <div className="font-mono" style={mono}>
                      {c.commit} · {c.file}
                    </div>
                  </li>
                ))}
                <li style={{ padding: "0 0 0 20px", position: "relative" }}>
                  <span style={dot(false)} />
                  <div style={{ fontWeight: 700 }}>{g.deletedAt ? `File deleted on ${fmtDate(g.deletedAt)}` : g.deletedAtHead ? "File deleted" : "Still in the current code"}</div>
                  <div className="font-mono" style={mono}>
                    Still readable in {g.commitCount} commit{g.commitCount === 1 ? "" : "s"}
                  </div>
                </li>
              </ol>
            </>
          )}
        </section>

        <section style={{ flex: "999 1 560px", minWidth: 0, background: "#22172F", border: "1px solid #33244A", borderRadius: 22, padding: 32 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#F2B544" }}>The exorcism ritual</div>
              <h2 style={{ margin: "8px 0 0", fontSize: 30 }}>
                {done.size} of {steps.length} steps done
              </h2>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done.size} aria-label="Ritual progress" style={{ width: 220, maxWidth: "100%", height: 10, borderRadius: 5, background: "#33244A", overflow: "hidden" }}>
              <div style={{ height: 10, background: "#F2B544", width: `${(done.size / steps.length) * 100}%`, transition: "width .4s" }} />
            </div>
          </div>

          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map((s) => {
              const on = done.has(s.id);
              return (
                <div key={s.id} style={{ borderRadius: 16, padding: 20, border: `1px solid ${on ? "#6FA878" : "#33244A"}`, background: on ? "#16271B" : "#1C1229" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <input type="checkbox" id={`step-${s.id}`} checked={on} onChange={() => toggle(s.id)} style={{ width: 24, height: 24, margin: "2px 0 0", accentColor: "#F2B544", flex: "none" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label htmlFor={`step-${s.id}`} style={{ fontWeight: 700, fontSize: 18, cursor: "pointer" }}>
                        {s.title}
                      </label>
                      <p style={{ margin: "6px 0 0", color: MUTED, fontSize: 15, lineHeight: 1.55 }}>{s.body}</p>
                      {s.command && (
                        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start", background: "#160E22", border: "1px solid #33244A", borderRadius: 10, padding: 14 }}>
                          <pre className="font-mono" style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre" }}>
                            {s.command}
                          </pre>
                          <CopyButton text={s.command} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" onClick={() => void confirm()} disabled={check.state === "checking"} style={{ height: 52, padding: "0 24px", border: 0, borderRadius: 12, background: "#F2B544", color: "#241604", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: check.state === "checking" ? 0.6 : 1 }}>
              {check.state === "checking" ? "Rescanning…" : "Rescan to confirm it's gone"}
            </button>
            <button type="button" disabled title="Needs the Haunted Repo GitHub App" style={{ height: 52, padding: "0 24px", borderRadius: 12, border: "1px solid #45345E", background: "transparent", color: "#9C8FAE", fontSize: 16 }}>
              Open fix branch as PR
            </button>
          </div>
          <div aria-live="polite">
            {check.state === "gone" && (
              <p role="status" style={{ margin: "18px 0 0", padding: "14px 16px", borderRadius: 12, background: "#16271B", border: "1px solid #6FA878", color: "#BDEBC5" }}>
                The ghost has left. No trace of this key in {result.commitsScanned} commits.{demo ? " (Demo: simulated rescan.)" : ""}
              </p>
            )}
            {check.state === "still" && (
              <p role="status" style={{ margin: "18px 0 0", padding: "14px 16px", borderRadius: 12, background: "#33240F", border: "1px solid #F2B544" }}>
                Still haunting {check.commits} commit{check.commits === 1 ? "" : "s"}.{missing ? ` Most likely missing: “${missing.title}”.` : " Did the force-push go through?"}
              </p>
            )}
          </div>
          {laid && <DecoyGhost finding={ghost} />}
        </section>
      </main>
    </div>
  );
}
