"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Sprite } from "@/components/Sprite";
import { CopyButton } from "@/components/house/CopyButton";
import { LiveSeance } from "./LiveSeance";

/**
 * Séance room (features 26, 32, 33), ported from the design kit.
 * The demo repo plays a prepared run; real repos stream a live Vercel Sandbox run (LiveSeance).
 */
type Tone = "ok" | "bad" | "warn" | "dim";
type Phase = "idle" | "running" | "proven" | "fixing" | "fixed";

const BEFORE: [Tone, string][] = [
  ["ok", "sandbox ready · node 22 · pnpm 9"],
  ["dim", "pnpm install --ignore-scripts"],
  ["ok", "312 packages installed in 8.4 s"],
  ["dim", "network closed"],
  ["dim", "pnpm build"],
  ["ok", "build passed in 11.2 s"],
  ["dim", "pnpm test"],
  ["ok", "41 tests passed"],
  ["dim", "writing proof test for spider/sql-concat"],
  ["bad", "FAIL orders.sql-injection.test.ts"],
  ["bad", "expected 0 rows, received 37"],
  ["warn", "problem proven: SQL is built from user input"],
];
const AFTER: [Tone, string][] = [
  ["dim", "applying patch to src/orders.ts"],
  ["dim", "pnpm test"],
  ["ok", "PASS orders.sql-injection.test.ts"],
  ["ok", "42 tests passed, 0 failed"],
  ["ok", "fix proven · ready to open a pull request"],
];
const COLOR: Record<Tone, string> = { ok: "#BDEBC5", bad: "#FF9B8A", warn: "#F2B544", dim: "#C2B6CF" };
const FORTUNES = [
  "The spirits see a merge conflict in your near future.",
  "A forgotten TODO will return on a Friday.",
  "Your next deploy will go smoothly. The one after, less so.",
  "The ball says: rotate your keys. It always says that.",
  "You will mass-rename a variable and regret nothing.",
];
const PROOF_TEST = `it('treats order ids as data', async () => {
  const id = "1 OR 1=1";
  const rows = await findOrders(id);
  expect(rows).toHaveLength(0);
});`;
const PATCH = `--- a/src/orders.ts
+++ b/src/orders.ts
@@ -42,1 +42,1 @@
-  const rows = await db.query(\`SELECT * FROM orders WHERE id = \${id}\`);
+  const rows = await db.query("SELECT * FROM orders WHERE id = $1", [id]);`;

const pill = (bg: string, fg: string): CSSProperties => ({ background: bg, color: fg });

export function SeanceRoom({ repoLabel, isDemo }: { repoLabel: string; isDemo: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState(0);
  const [level, setLevel] = useState<"suggest" | "pr" | "merge">("pr");
  const [prOpened, setPrOpened] = useState(false);
  const [gazes, setGazes] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const tick = (total: number, end: Phase, from: number) => {
    if (timer.current) window.clearInterval(timer.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(total);
      setPhase(end);
      return;
    }
    let n = from;
    timer.current = window.setInterval(() => {
      n += 1;
      if (n >= total) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        setShown(total);
        setPhase(end);
      } else setShown(n);
    }, 380);
  };

  const all = phase === "fixing" || phase === "fixed" ? [...BEFORE, ...AFTER] : BEFORE;
  const lines = all.slice(0, phase === "idle" ? 0 : shown);
  const running = phase === "running" || phase === "fixing";
  const proven = phase === "proven" || phase === "fixing" || phase === "fixed";
  const fixed = phase === "fixed";

  const run = () => {
    if (running) return;
    setPrOpened(false);
    setShown(0);
    setPhase("running");
    tick(BEFORE.length, "proven", 0);
  };
  const applyFix = () => {
    setPhase("fixing");
    tick(BEFORE.length + AFTER.length, "fixed", BEFORE.length);
  };

  const status = running ? ["Running", pill("#33240F", "#F7CD7A")] : fixed ? ["All green", pill("#16271B", "#BDEBC5")] : proven ? ["Problem proven", pill("#3A1A1A", "#FF9B8A")] : ["Idle", pill("#33244A", "#C2B6CF")];
  const proof = fixed ? ["Fixed and proven", pill("#16271B", "#BDEBC5")] : proven ? ["Reproduced", pill("#3A1A1A", "#FF9B8A")] : ["Not run yet", pill("#33244A", "#C2B6CF")];

  return (
    <div style={{ minHeight: "100vh", background: "#160E22", color: "#F3ECDD" }}>
      <header style={{ borderBottom: "1px solid #33244A" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 32px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <Link href={isDemo ? "/house?demo=1&cached=1" : `/house?repo=${encodeURIComponent(repoLabel)}&cached=1`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#F3ECDD" }}>
            <span className="font-display" style={{ fontSize: 26 }}>Haunted Repo</span>
            <span style={{ fontSize: 15, color: "#9C8FAE" }}>Séance room</span>
          </Link>
          <span className="font-mono" style={{ fontSize: 14, color: "#C2B6CF", background: "#1C1229", border: "1px solid #33244A", borderRadius: 10, padding: "10px 14px" }}>{repoLabel}</span>
        </div>
      </header>

      <section aria-label="Séance table" style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid #33244A", background: "#1C1229" }}>
        <div aria-hidden="true" className="orb" style={{ position: "absolute", right: "calc(8% + 150px)", top: 30, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,#7FD6C92E 0%,#7FD6C90F 45%,transparent 70%)" }} />
        <div className="seanceart" style={{ position: "absolute", zIndex: 3, right: "8%", bottom: -20, width: 600, height: 300 }}>
          <button type="button" onClick={() => setGazes((g) => g + 1)} aria-label="Gaze into the crystal ball" style={{ position: "absolute", left: "calc(56% - 34px)", top: "calc(44% - 34px)", width: 68, height: 68, borderRadius: "50%", border: 0, padding: 0, background: "transparent", cursor: "pointer" }} />
          {gazes > 0 && (
            <div className="rise" role="status" style={{ position: "absolute", left: "30%", top: -34, width: 300, background: "#F3ECDD", color: "#160E22", borderRadius: 14, padding: "12px 14px", fontSize: 15, fontWeight: 600, lineHeight: 1.4, boxShadow: "0 10px 30px #00000066" }}>
              {FORTUNES[(gazes - 1) % FORTUNES.length]}
            </div>
          )}
        </div>
        <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "56px 32px 52px" }}>
          <h1 className="font-display" style={{ margin: 0, fontWeight: 400, fontSize: "clamp(52px, 7vw, 76px)", lineHeight: 1 }}>Let the code speak</h1>
          <p style={{ margin: "14px 0 0", maxWidth: 560, fontSize: 19, lineHeight: 1.55, color: "#C2B6CF" }}>
            We run your build and tests in a sealed sandbox, prove each problem with a failing test, fix it, and only then open a pull request.
          </p>
          {isDemo && <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button type="button" onClick={run} style={{ height: 56, padding: "0 26px", border: 0, borderRadius: 14, fontWeight: 800, fontSize: 17, cursor: "pointer", ...(running ? { background: "#45345E", color: "#C2B6CF" } : { background: "#F2B544", color: "#241604" }) }}>
              {running ? "The spirits are talking…" : phase === "idle" ? "Begin the séance" : "Run again"}
            </button>
            <span style={{ fontSize: 15, color: "#9C8FAE", maxWidth: 520 }}>No secrets, no tokens, no network after install. The sandbox is destroyed after the run.</span>
          </div>}
        </div>
      </section>

      {!isDemo ? <LiveSeance repo={repoLabel} /> : <main style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 32px 64px", display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}>
        <section aria-label="Sandbox output" style={{ flex: "999 1 560px", minWidth: 0, perspective: 1400 }}>
          <div style={{ background: "#0F0918", border: "2px solid #33244A", borderRadius: 18, overflow: "hidden", transform: "rotateX(1.5deg)", transformOrigin: "50% 0", boxShadow: "0 30px 60px #00000066" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #33244A", background: "#1C1229" }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 12, height: 12, borderRadius: 6, background: "#45345E" }} />
              ))}
              <span style={{ marginLeft: 8, fontSize: 14, color: "#C2B6CF" }}>Sandbox: Firecracker microVM, 2 vCPU</span>
              <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 20, ...(status[1] as CSSProperties) }}>{status[0] as string}</span>
            </div>
            <div role="log" aria-live="polite" className="font-mono" style={{ minHeight: 420, padding: "18px 20px", fontSize: 14, lineHeight: 1.8 }}>
              {phase === "proven" && (
                <div style={{ float: "right", width: 80, height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <Sprite kind="banshee" scale={0.6} />
                </div>
              )}
              {phase === "idle" && <div style={{ color: "#9C8FAE" }}>Waiting for the séance to begin. Press &quot;Begin the séance&quot;.</div>}
              {lines.map(([tone, text], i) => (
                <div key={i} className="logline" style={{ color: COLOR[tone] }}>
                  <span style={{ color: "#6E6182", marginRight: 14 }}>00:{String(2 + i * 3).padStart(2, "0")}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside style={{ flex: "1 1 380px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          <section aria-label="Proof of haunting" style={{ background: "#22172F", border: "2px solid #33244A", borderRadius: 18, padding: 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 48, height: 30, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <Sprite kind="spider" scale={0.42} />
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Proof of haunting</h2>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 20, ...(proof[1] as CSSProperties) }}>{proof[0] as string}</span>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.5, color: "#C2B6CF" }}>
              Spider: SQL built from user input in <span className="font-mono" style={{ fontSize: 13 }}>src/orders.ts:42</span>
            </p>
            <pre className="font-mono" style={{ margin: "14px 0 0", background: "#160E22", border: "1px solid #33244A", borderRadius: 12, padding: 14, fontSize: 12.5, lineHeight: 1.65, overflowX: "auto" }}>
              {PROOF_TEST}
            </pre>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
              <div style={{ borderRadius: 12, padding: 12, ...(proven ? { background: "#2A1414", border: "1px solid #7A3A3A" } : { background: "#1C1229", border: "1px solid #33244A" }) }}>
                <div style={{ fontSize: 13, color: "#C2B6CF" }}>Before fix</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{proven ? "Failing" : "Not run"}</div>
              </div>
              <div style={{ borderRadius: 12, padding: 12, ...(fixed ? { background: "#132018", border: "1px solid #6FA878" } : { background: "#1C1229", border: "1px solid #33244A" }) }}>
                <div style={{ fontSize: 13, color: "#C2B6CF" }}>After fix</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{fixed ? "Passing" : phase === "fixing" ? "Running…" : "Not run"}</div>
              </div>
            </div>
            {phase === "proven" && (
              <button type="button" onClick={applyFix} style={{ marginTop: 16, width: "100%", height: 50, border: 0, borderRadius: 12, background: "#F2B544", color: "#241604", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
                Apply fix and rerun tests
              </button>
            )}
          </section>

          {fixed && (
            <section aria-label="Pull request" className="rise" style={{ background: "#22172F", border: "2px solid #9FD6A8", borderRadius: 18, padding: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Ready to push</h2>
              <p className="font-mono" style={{ margin: "6px 0 0", fontSize: 13, color: "#BDEBC5" }}>
                haunted-repo/exorcism-{new Date().toISOString().slice(0, 10)} → main
              </p>
              <ul style={{ margin: "14px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 15 }}>
                <li>Use a parameterized query in findOrders</li>
                <li>Add proof test orders.sql-injection.test.ts</li>
                <li>Pin actions/checkout to a commit SHA</li>
              </ul>
              <p style={{ margin: "14px 0 0", fontSize: 15, color: "#C2B6CF" }}>Build passing. Tests 42 of 42 passing, one more than before.</p>
              <fieldset style={{ margin: "16px 0 0", padding: 0, border: 0 }}>
                <legend style={{ fontSize: 14, color: "#9C8FAE", marginBottom: 8 }}>When fixes are ready</legend>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(
                    [
                      ["suggest", "Suggest only"],
                      ["pr", "Open a PR"],
                      ["merge", "PR and auto-merge"],
                    ] as const
                  ).map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={level === id} onClick={() => setLevel(id)} style={{ height: 40, padding: "0 14px", borderRadius: 20, fontSize: 14, cursor: "pointer", ...(level === id ? { background: "#F3ECDD", color: "#160E22", border: "1px solid #F3ECDD" } : { background: "transparent", color: "#C2B6CF", border: "1px solid #45345E" }) }}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {level === "suggest" ? (
                <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  <CopyButton text={PATCH} label="Copy the patch" />
                </div>
              ) : (
                <button type="button" onClick={() => setPrOpened(true)} style={{ marginTop: 16, width: "100%", height: 50, border: 0, borderRadius: 12, background: "#9FD6A8", color: "#0F2414", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
                  {prOpened ? "Pull request #48 opened (demo)" : "Open pull request"}
                </button>
              )}
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "#9C8FAE" }}>Never pushes to main. One click closes the pull request and deletes the branch.</p>
            </section>
          )}
        </aside>
      </main>}
    </div>
  );
}
