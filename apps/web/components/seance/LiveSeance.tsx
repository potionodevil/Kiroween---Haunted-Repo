"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Sprite } from "@/components/Sprite";
import { loginHref, useViewer } from "@/lib/client/viewer";

/** Live séance for a real repo: streams build and test output from a Vercel Sandbox (/api/seance). */
type Tone = "ok" | "bad" | "warn" | "dim" | "cmd";
type Step = "boot" | "install" | "build" | "test";
type StepStatus = "wait" | "run" | "pass" | "fail" | "skip";
type Ev =
  | { t: "line"; tone: Tone; text: string }
  | { t: "step"; step: Step; status: Exclude<StepStatus, "wait"> }
  | { t: "done"; build: string; test: string; failing: string[]; lang?: string }
  | { t: "error"; message: string };

const COLOR: Record<Tone, string> = { ok: "#BDEBC5", bad: "#FF9B8A", warn: "#F2B544", dim: "#C2B6CF", cmd: "#F3ECDD" };
const STEPS: [Step, string][] = [["boot", "Sandbox"], ["install", "Install"], ["build", "Build"], ["test", "Tests"]];
const MARK: Record<StepStatus, [string, string]> = {
  wait: ["·", "#6E6182"],
  run: ["…", "#F2B544"],
  pass: ["✔", "#BDEBC5"],
  fail: ["✖", "#FF9B8A"],
  skip: ["–", "#9C8FAE"],
};

export function LiveSeance({ repo }: { repo: string }) {
  const viewer = useViewer(repo);
  const [lines, setLines] = useState<{ tone: Tone; text: string }[]>([]);
  const [steps, setSteps] = useState<Record<Step, StepStatus>>({ boot: "wait", install: "wait", build: "wait", test: "wait" });
  const [done, setDone] = useState<Extract<Ev, { t: "done" }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  const run = async () => {
    setRunning(true);
    setLines([]);
    setDone(null);
    setError(null);
    setSteps({ boot: "wait", install: "wait", build: "wait", test: "wait" });
    started.current = Date.now();
    try {
      const res = await fetch("/api/seance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo }) });
      if (!res.ok || !res.body) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `The séance answered ${res.status}.`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p) continue;
          const ev = JSON.parse(p) as Ev;
          if (ev.t === "line") setLines((l) => [...l, { tone: ev.tone, text: ev.text }]);
          else if (ev.t === "step") setSteps((s) => ({ ...s, [ev.step]: ev.status }));
          else if (ev.t === "done") setDone(ev);
          else setError(ev.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The séance broke off.");
    } finally {
      setRunning(false);
    }
  };

  const next = `/seance?repo=${encodeURIComponent(repo)}`;
  const gate =
    viewer === null ? "Checking who you are…"
    : !viewer.configured ? "GitHub login is not set up on this server yet."
    : !viewer.login ? null
    : !viewer.owner ? `@${viewer.login} has no push access to ${repo}. A live séance runs only for the repo's own people.`
    : null;
  const secs = () => Math.round((Date.now() - started.current) / 1000);
  const banshee = done && (done.build === "fail" || done.test === "fail");

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 32px 64px", display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}>
      <section aria-label="Sandbox output" style={{ flex: "999 1 560px", minWidth: 0 }}>
        <div className="term" style={{ background: "#0F0918", border: "2px solid #33244A", borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 60px #00000066" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #33244A", background: "#1C1229" }}>
            {["#FF9B8A", "#F2B544", "#9FD6A8"].map((c) => (
              <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, opacity: 0.7 }} />
            ))}
            <span className="font-mono" style={{ marginLeft: 8, fontSize: 13, color: "#C2B6CF" }}>séance — {repo} — vercel sandbox</span>
          </div>
          <div ref={logRef} role="log" aria-live="polite" className="font-mono" style={{ height: 460, overflowY: "auto", padding: "16px 18px", fontSize: 13.5, lineHeight: 1.7 }}>
            {lines.length === 0 && !running && (
              <div style={{ color: "#9C8FAE" }}>
                <span style={{ color: "#9FD6A8" }}>haunted@seance</span>:<span style={{ color: "#7FD6C9" }}>~</span>$ <span className="caret">▌</span>
              </div>
            )}
            {lines.map((l, i) => (
              <div key={i} style={{ color: COLOR[l.tone], whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {l.tone === "cmd" ? (
                  <>
                    <span style={{ color: "#9FD6A8" }}>haunted@seance</span>:<span style={{ color: "#7FD6C9" }}>~</span>{l.text}
                  </>
                ) : (
                  l.text
                )}
              </div>
            ))}
            {running && (
              <div style={{ color: "#F2B544" }}>
                <span className="caret">▌</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <aside style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <section aria-label="Séance steps" className="font-mono seance-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span className="flame" aria-hidden="true" />
            <span className="font-display" style={{ fontSize: 24, color: "#F2B544", fontFamily: "var(--ff-display)" }}>The séance</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#9C8FAE" }}>
              {Object.values(steps).filter((x) => x === "pass" || x === "fail" || x === "skip").length}/4
            </span>
          </div>
          <div aria-hidden="true" style={{ height: 4, borderRadius: 2, background: "#160E22", overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${(Object.values(steps).filter((x) => x === "pass" || x === "fail" || x === "skip").length / 4) * 100}%`, background: "linear-gradient(90deg,#F2B544,#7FD6C9)", transition: "width .3s" }} />
          </div>
          {STEPS.map(([id, label]) => (
            <div key={id} style={{ display: "flex", gap: 12, padding: "6px 0" }}>
              <span style={{ width: 18, color: MARK[steps[id]][1], fontWeight: 800 }}>{MARK[steps[id]][0]}</span>
              <span>{label}</span>
              <span style={{ marginLeft: "auto", color: "#9C8FAE" }}>{steps[id]}</span>
            </div>
          ))}
          {gate ? (
            <p style={{ margin: "14px 0 0", color: "#C2B6CF", fontFamily: "inherit" }}>{gate}</p>
          ) : viewer && !viewer.login ? (
            <a href={loginHref(next)} style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 12, background: "#F3ECDD", color: "#160E22", fontWeight: 800, textDecoration: "none" }}>
              Log in with GitHub to start
            </a>
          ) : (
            <button type="button" onClick={() => void run()} disabled={running} style={{ marginTop: 16, width: "100%", height: 52, border: 0, borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: running ? "default" : "pointer", ...(running ? { background: "#45345E", color: "#C2B6CF" } : { background: "#F2B544", color: "#241604" }) }}>
              {running ? "The spirits are talking…" : done ? "Run the séance again" : "Begin the séance"}
            </button>
          )}
          <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#9C8FAE", fontFamily: "inherit" }}>
            No secrets go in. Install without scripts. Network closes after install. The sandbox is destroyed after the run.
          </p>
        </section>

        {error && (
          <p role="alert" style={{ margin: 0, padding: "12px 16px", borderRadius: 12, border: "1px solid #7A3A3A", background: "#2A1414", color: "#FF9B8A" }}>{error}</p>
        )}

        {done && (
          <section aria-label="Verdict" className="rise" style={{ background: "#22172F", border: `2px solid ${banshee ? "#7A3A3A" : "#6FA878"}`, borderRadius: 18, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 56, height: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <Sprite kind={banshee ? "banshee" : "ghost"} scale={0.5} paused={!banshee} />
              </div>
              <h2 style={{ margin: 0, fontSize: 22 }}>{banshee ? "A banshee screams" : "The spirits are calm"}</h2>
            </div>
            <p className="font-mono" style={{ margin: "10px 0 0", fontSize: 14, color: "#C2B6CF" }}>
              {done.lang ? `${done.lang} · ` : ""}build {done.build} · tests {done.test} · {secs()} s
            </p>
            {done.failing.length > 0 && (
              <ul className="font-mono" style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, color: "#FF9B8A" }}>
                {done.failing.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
            <Link href={`/house?repo=${encodeURIComponent(repo)}&cached=1`} style={{ display: "inline-block", marginTop: 14, color: "#F2B544" }}>
              Back to the house
            </Link>
          </section>
        )}
      </aside>
    </main>
  );
}
