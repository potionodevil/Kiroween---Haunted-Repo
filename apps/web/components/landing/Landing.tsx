"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { parseRepo, type CreatureKind } from "@haunted/core";
import { Sprite } from "@/components/Sprite";

/** Trading card data, from the design kit. */
const K: [CreatureKind, string, string, string, string, number, string, string, string, string][] = [
  ["ghost", "Ghost", "Leaked secrets", "#F3ECDD", "#F3ECDD55", 5, "Guided ritual", "API keys, tokens and passwords in any of the last 300 commits, even in files you deleted long ago.", "sk_live_••••4f2a in config/payments.js, commit a3f91c2", "Revoke the key, move it to an env variable, rewrite history, install the guard."],
  ["vampire", "Vampire", "Vulnerable dependencies", "#E07A7E", "#C8464A55", 4, "Auto-fix", "Packages in your lockfile with known advisories, checked against the OSV database.", "lodash 4.17.20 via express-validator, GHSA-35jh", "Smallest safe upgrade in the lockfile, opened as a pull request."],
  ["spider", "Spider", "Insecure code", "#C9A6FF", "#6E50964D", 5, "Proof test", "Code that trusts input it should not: SQL strings, eval, innerHTML, disabled TLS checks.", "`SELECT * FROM orders WHERE id = ${id}` in src/orders.ts:42", "Parameterized query plus a test that fails before and passes after."],
  ["poltergeist", "Poltergeist", "Unsafe CI setup", "#7FD6C9", "#7FD6C955", 4, "Auto-fix", "GitHub Actions that run untrusted code with secrets, unpinned actions, .env files that are not ignored.", "pull_request_target with checkout of PR head in ci.yml:3", "Safer trigger, actions pinned to a commit SHA, .env in .gitignore."],
  ["possessed", "The Possessed", "AI agent risks", "#C9A6FF", "#6E50964D", 4, "Guided", "Tokens in MCP configs, model output piped into a shell, agent instructions that switch off safety checks.", "GitHub token in .kiro/settings/mcp.json:7", "Env variable in the config, token revoked, tool calls need confirmation."],
  ["zombie", "Zombie", "Bugs", "#9FD6A8", "#9FD6A84D", 3, "Auto-fix", "ESLint over the whole repo: unhandled promises, unused variables, unreachable code.", "Promise not awaited in src/checkout.ts:88", "eslint --fix where safe, one commit per fix."],
  ["bat", "Bat", "Slow code", "#7FD6C9", "#7FD6C955", 2, "Suggested rewrite", "Database queries inside loops, heavy library imports, listeners that are never removed.", "One query per order inside a loop, src/orders.ts:42", "A rewrite with one batched query and the reason why."],
  ["banshee", "Banshee", "Runtime failures", "#C2B6CF", "#C2B6CF4D", 4, "Proven fix", "Your build and tests run in a sealed sandbox. Whatever breaks starts wailing.", "tests/cart.test.ts: expected 2 items, received 3", "Fix applied in the sandbox, tests rerun, pushed only when green."],
  ["skeleton", "Skeleton", "Architecture", "#D6C8A8", "#D6C8A84D", 2, "Advice", "Stack card, architecture score and stack-fit hints, always with the evidence behind them.", "src/api/handlers.ts holds 23 handlers in 812 lines", "A split plan with migration cost, or a small change inside your current stack."],
  ["mummy", "Mummy", "Documentation", "#D6C8A8", "#D6C8A84D", 1, "Auto-fix", "READMEs that disagree with the code, missing SECURITY.md, missing agent instructions.", "README says npm start, package.json has no start script", "An unwrapped README as a diff, unknown facts marked TODO."],
];

const TOWER_LINES = ["I'm committed.", "Still in 47 commits. Help.", "Have you tried git filter-repo?", "Boo. Also, rotate your keys."];

const WALKERS: { kind: CreatureKind; top: number; dur: number; delay: number }[] = [
  { kind: "ghost", top: 476, dur: 24, delay: -4 },
  { kind: "zombie", top: 470, dur: 32, delay: -18 },
  { kind: "bat", top: 180, dur: 16, delay: -7 },
  { kind: "zombie", top: 640, dur: 28, delay: -12 },
  { kind: "vampire", top: 452, dur: 38, delay: -26 },
  { kind: "skeleton", top: 470, dur: 46, delay: -9 },
  { kind: "mummy", top: 630, dur: 52, delay: -33 },
  { kind: "spider", top: 690, dur: 22, delay: -15 },
  { kind: "banshee", top: 300, dur: 30, delay: -20 },
  { kind: "possessed", top: 120, dur: 27, delay: -6 },
  { kind: "ghost", top: 660, dur: 20, delay: -2 },
];

const STEPS = [
  ["Revoke the key", "It stops working everywhere, including in old commits."],
  ["Move the new one to an environment variable", "We show the exact line to change for your framework."],
  ["Rewrite history", "One git filter-repo command removes it from every commit."],
  ["Install the guard", "A pre-commit hook stops the next key before it is committed."],
];

const SCENE: CSSProperties = { position: "absolute", left: "50%", bottom: 0, width: "max(100%, 1564px)", aspectRatio: "16/9", transform: "translateX(-44%)" };
const MUTED = "#C2B6CF";
const DIM = "#9C8FAE";

export function Landing() {
  const router = useRouter();
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  const [moon, setMoon] = useState(0);
  const [swarm, setSwarm] = useState(false);
  const [tower, setTower] = useState(0);
  const [boo, setBoo] = useState(false);
  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confess, setConfess] = useState(false);
  const towerTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(towerTimer.current), []);

  const seenCount = Object.keys(seen).length;

  const tilt = (e: MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget;
    const r = b.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    b.style.setProperty("--ry", `${((x - 0.5) * 22).toFixed(1)}deg`);
    b.style.setProperty("--rx", `${((0.5 - y) * 18).toFixed(1)}deg`);
    b.style.setProperty("--mx", String(Math.round(x * 100)));
  };
  const untilt = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.setProperty("--ry", "0deg");
    e.currentTarget.style.setProperty("--rx", "0deg");
  };

  const moonClick = () => {
    const n = moon + 1;
    if (n >= 3) {
      setMoon(0);
      setSwarm(true);
      window.setTimeout(() => setSwarm(false), 6200);
    } else setMoon(n);
  };
  const towerGhost = () => {
    setTower((t) => t + 1);
    window.clearTimeout(towerTimer.current);
    towerTimer.current = window.setTimeout(() => setTower(0), 2600);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = parseRepo(repo);
    if (!ref) {
      setError("That does not look like a GitHub repo");
      return;
    }
    router.push(`/house?repo=${encodeURIComponent(`${ref.owner}/${ref.repo}`)}`);
  };

  return (
    <div style={{ background: "#160E22", color: "#F3ECDD" }}>
      <header style={{ position: "relative", zIndex: 10, maxWidth: 1240, margin: "0 auto", padding: "26px 32px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#F3ECDD" }}>
          <svg width="30" height="34" viewBox="0 0 34 38" aria-hidden="true">
            <path d="M17 2C8.7 2 3 8.3 3 16.5V35l4.7-3.5L12.3 35 17 31.5 21.7 35l4.6-3.5L31 35V16.5C31 8.3 25.3 2 17 2Z" fill="#F3ECDD" />
            <circle cx="12" cy="16" r="2.6" fill="#F2B544" />
            <circle cx="22" cy="16" r="2.6" fill="#F2B544" />
          </svg>
          <span className="font-display" style={{ fontSize: 32 }}>Haunted Repo</span>
        </Link>
        <nav aria-label="Main" style={{ display: "flex", flexWrap: "wrap", gap: 28, fontSize: 16 }}>
          <a href="#creatures" style={{ color: MUTED, textDecoration: "none" }}>What it finds</a>
          <a href="#ritual" style={{ color: MUTED, textDecoration: "none" }}>How fixing works</a>
          <Link href="/house?demo=1" style={{ color: MUTED, textDecoration: "none" }}>Live demo</Link>
        </nav>
      </header>

      <section className="dolly" aria-label="Enter the haunted house" style={{ position: "relative", height: 2600, marginTop: -86 }}>
        <div className="sticky-stage" style={{ position: "sticky", top: 0, height: 880, overflow: "hidden", perspective: 1000, perspectiveOrigin: "75% 76%", background: "#160E22" }}>
          <div className="hall fx" aria-hidden="true" style={{ position: "absolute", inset: 0, background: "#2C1E40 url(/art/hall.png) repeat-x 0 0/auto 100%", imageRendering: "pixelated" }}>
            {WALKERS.map((w, i) => (
              <div key={i} className="walk" style={{ top: w.top, animationDuration: `${w.dur}s`, animationDelay: `${w.delay}s` }}>
                <Sprite kind={w.kind} />
              </div>
            ))}
          </div>

          <div aria-hidden="true" style={SCENE}>
            <div className="lay l0" />
          </div>
          <div className="facade fx" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
            <div style={{ ...SCENE, transformStyle: "preserve-3d" }}>
              <div aria-hidden="true" className="lay l1" style={{ transform: "translateZ(-250px) scale(1.25)" }} />
              <div aria-hidden="true" className="lay l2" />
              <button type="button" className="egg" onClick={towerGhost} aria-label="Something is in the tower window" style={{ left: "45.4%", top: "25.5%", width: "5%", aspectRatio: "1" }} />
              {tower > 0 && (
                <div className="pop" role="status" style={{ position: "absolute", left: "49%", top: "17%", background: "#F3ECDD", color: "#160E22", fontWeight: 800, fontSize: 15, padding: "8px 12px", borderRadius: "12px 12px 12px 2px", whiteSpace: "nowrap" }}>
                  {TOWER_LINES[(tower - 1) % TOWER_LINES.length]}
                </div>
              )}
              <div aria-hidden="true" className="doorglow" style={{ position: "absolute", left: "67.2%", top: "77.8%", width: "14%", aspectRatio: "1", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle,#F2B54455 0%,#F2B5441A 40%,transparent 70%)" }} />
              <div aria-hidden="true" className="lay l3" style={{ inset: "-2% -8% -2% -8%", transform: "translateZ(80px) scale(.925)" }} />
              <div aria-hidden="true" className="fog" style={{ position: "absolute", left: "-10%", right: "-10%", bottom: "8%", height: "14%", borderRadius: "50%", background: "radial-gradient(ellipse at center,#7FD6C926 0%,#7FD6C90D 45%,transparent 70%)", transform: "translateZ(200px) scale(.83)" }} />
              <div aria-hidden="true" className="fog fog2" style={{ position: "absolute", left: "-20%", right: "-5%", bottom: "2%", height: "16%", borderRadius: "50%", background: "radial-gradient(ellipse at center,#C2B6CF1F 0%,transparent 65%)", transform: "translateZ(300px) scale(.77)" }} />
            </div>
          </div>

          <div style={{ ...SCENE, zIndex: 4, pointerEvents: "none" }}>
            <button type="button" className="egg" onClick={moonClick} aria-label="The full moon" style={{ left: "76.5%", top: "9%", width: "11%", aspectRatio: "1", pointerEvents: "auto" }} />
            {swarm && (
              <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: "6%", height: "30%", overflow: "hidden" }}>
                {[
                  ["10%", 0, 0.6, "bat"],
                  ["30%", 0.3, 0.45, "bat"],
                  ["5%", 0.6, 0.5, "bat"],
                  ["45%", 0.9, 0.4, "bat"],
                  ["20%", 1.2, 0.5, "poltergeist"],
                ].map(([top, delay, scale, kind], i) => (
                  <div key={i} className="swarm" style={{ top: top as string, animationDelay: `${delay}s` }}>
                    <Sprite kind={kind as CreatureKind} scale={scale as number} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: "relative", zIndex: 5, maxWidth: 1240, margin: "0 auto", padding: "150px 32px 0", pointerEvents: "none" }}>
            <div className="cap1 fx" style={{ maxWidth: 580, pointerEvents: "auto" }}>
              <h1 className="font-display" style={{ margin: 0, fontWeight: 400, fontSize: "clamp(56px, 8vw, 96px)", lineHeight: 0.95 }}>
                Your git history is haunted.
              </h1>
              <p style={{ margin: "22px 0 0", fontSize: 21, lineHeight: 1.5, color: MUTED, maxWidth: 540 }}>
                You deleted the API key months ago. It is still in commit a3f91c2, waiting. Haunted Repo finds it, together with the bugs and slow code hiding next to it.
              </p>
              <form onSubmit={submit} style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 12, maxWidth: 600 }}>
                <label htmlFor="repo" className="sr-only">GitHub repository URL</label>
                <input
                  id="repo"
                  type="text"
                  inputMode="url"
                  value={repo}
                  onChange={(e) => {
                    setRepo(e.target.value);
                    setError(null);
                    setBoo(e.target.value.trim().toLowerCase() === "boo");
                  }}
                  placeholder="github.com/you/your-repo"
                  aria-invalid={error ? true : undefined}
                  aria-describedby="repo-hint"
                  style={{ flex: "1 1 300px", minWidth: 0, height: 58, boxSizing: "border-box", padding: "0 18px", borderRadius: 14, border: "2px solid #45345E", background: "#1C1229", color: "#F3ECDD", fontFamily: "inherit", fontSize: 17 }}
                />
                <button type="submit" style={{ height: 58, display: "inline-flex", alignItems: "center", padding: "0 28px", borderRadius: 14, background: "#F2B544", color: "#241604", fontWeight: 800, fontSize: 17, border: 0, cursor: "pointer" }}>
                  Scan my repo
                </button>
              </form>
              {boo && (
                <div className="pop" role="status" style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 12, background: "#22172F", border: "2px solid #45345E", borderRadius: 14, padding: "8px 16px 8px 8px" }}>
                  <div style={{ width: 48, height: 54, overflow: "hidden" }}>
                    <Sprite kind="ghost" scale={0.5} />
                  </div>
                  <span style={{ fontWeight: 800 }}>Boo to you too. Now paste a real repo.</span>
                </div>
              )}
              <p id="repo-hint" style={{ margin: "14px 0 0", fontSize: 15, color: error ? "#F2B544" : DIM }}>
                {error ?? "Free for public repos. Secrets are masked and never stored. Scroll to step inside."}
              </p>
              <Link href="/house?demo=1" style={{ display: "inline-block", marginTop: 8, fontSize: 15, color: "#F2B544" }}>
                Try a haunted demo repo
              </Link>
            </div>
          </div>

          <div className="cap2 fx" style={{ pointerEvents: "none", position: "absolute", zIndex: 5, left: 0, right: 0, margin: "0 auto", top: 96, width: "min(760px,90%)", textAlign: "center", opacity: 0 }}>
            <p className="font-display" style={{ margin: 0, fontSize: 72, lineHeight: 1 }}>Step through the door</p>
            <p style={{ margin: "14px 0 0", fontSize: 20, color: MUTED }}>Every commit is a room. We walk through 300 of them in about ten seconds.</p>
          </div>
          <div className="cap3 fx" style={{ pointerEvents: "none", position: "absolute", zIndex: 5, left: 0, right: 0, bottom: 56, textAlign: "center", opacity: 0 }}>
            <p className="font-display" style={{ margin: 0, fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1 }}>Something is already walking around</p>
            <p style={{ margin: "12px 0 0", fontSize: 19, color: MUTED }}>Ghosts, vampires, spiders, zombies and six more. Each one is a real problem in your code.</p>
          </div>
        </div>
      </section>

      <section id="creatures" style={{ maxWidth: 1240, margin: "0 auto", padding: "120px 32px 0" }}>
        <h2 className="font-display" style={{ margin: 0, fontWeight: 400, fontSize: 64, lineHeight: 1 }}>Ten kinds of trouble, one scan</h2>
        <p style={{ margin: "16px 0 0", fontSize: 19, color: MUTED, maxWidth: 640 }}>
          Every finding gets a creature, a severity and a fix. Tilt a card to see it shimmer, click it to read the back.{" "}
          {seenCount > 0 && seenCount < 10 ? `${seenCount} of 10 read.` : ""}
        </p>
        <div className="tgrid" style={{ marginTop: 48 }}>
          {K.map((k, i) => {
            const [kind, name, what, accent, glow, danger, fixType, desc, example, fix] = k;
            const on = Boolean(flipped[kind]);
            const face = (bg: string): CSSProperties => ({ background: bg, border: `3px solid ${accent}`, boxShadow: "inset 0 0 0 3px #160E22, 0 18px 40px #00000066" });
            return (
              <button
                key={kind}
                type="button"
                className="tcard"
                onClick={() => {
                  setFlipped((f) => {
                    const n = { ...f };
                    if (n[kind]) delete n[kind];
                    else n[kind] = true;
                    return n;
                  });
                  setSeen((s) => ({ ...s, [kind]: true }));
                }}
                onMouseMove={tilt}
                onMouseLeave={untilt}
                aria-pressed={on}
                aria-label={`${name}, ${what}. ${on ? `${desc} Fix: ${fix}` : "Show the back of the card."}`}
              >
                <div className="tinner" style={{ "--flip": on ? "180deg" : "0deg" } as CSSProperties}>
                  <div className="tface" style={face("#22172F")}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 16px 0" }}>
                      <span className="font-display" style={{ fontSize: 30, lineHeight: 1 }}>{name}</span>
                      <span style={{ fontSize: 12, color: MUTED }}>No. {String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div style={{ margin: "10px 12px 0", flex: 1, borderRadius: 10, border: "2px solid #45345E", background: "#1C1229 url(/art/wallpaper.png) repeat 0 0/96px 96px", imageRendering: "pixelated", position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 18, overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: "50%", bottom: 8, width: "70%", height: 22, marginLeft: "-35%", borderRadius: "50%", background: `radial-gradient(ellipse,${glow} 0%,transparent 70%)` }} />
                      <Sprite kind={kind} className="relative" />
                    </div>
                    <div style={{ padding: "12px 16px 14px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: accent }}>{what}</div>
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: MUTED }}>
                        <span>
                          Danger <span style={{ letterSpacing: 2, color: "#F2B544" }}>{"●".repeat(danger) + "○".repeat(5 - danger)}</span>
                        </span>
                        <span>{fixType}</span>
                      </div>
                    </div>
                    <div className="holo" />
                  </div>
                  <div className="tface tback" style={face("#1C1229")}>
                    <div style={{ padding: 18 }}>
                      <div className="font-display" style={{ fontSize: 28, lineHeight: 1 }}>{name}</div>
                      <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.45, color: "#F3ECDD" }}>{desc}</p>
                      <div style={{ marginTop: 12, fontSize: 12, color: DIM }}>Example finding</div>
                      <div className="font-mono" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, background: "#160E22", border: "1px solid #33244A", borderRadius: 8, padding: 7, color: MUTED, wordBreak: "break-word" }}>
                        {example}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 12, color: DIM }}>How it is fixed</div>
                      <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.4, color: "#9FD6A8" }}>{fix}</div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {seenCount === 10 && (
          <div className="pop" role="status" style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", borderRadius: 20, padding: "24px 28px", border: "3px solid #F2B544", background: "linear-gradient(120deg,#33240F,#22172F,#1F3A36,#33240F)", backgroundSize: "300% 300%", animation: "hrlegend 8s ease infinite" }}>
            <div style={{ width: 96, height: 108, filter: "sepia(1) saturate(4) hue-rotate(-10deg)" }}>
              <Sprite kind="ghost" />
            </div>
            <div style={{ flex: "1 1 300px" }}>
              <div style={{ fontSize: 13, color: "#F7CD7A" }}>Secret card unlocked, No. 11 of 10</div>
              <div className="font-display" style={{ fontSize: 40, lineHeight: 1.1 }}>The Maintainer</div>
              <p style={{ margin: "6px 0 0", color: "#F3ECDD", fontSize: 16 }}>
                Finds nothing. Fixes everything. Answers issues at 3 a.m. You read every card, so this one is yours.
              </p>
            </div>
          </div>
        )}
      </section>

      <section id="ritual" style={{ maxWidth: 1240, margin: "0 auto", padding: "120px 32px 0", display: "flex", flexWrap: "wrap", gap: 56 }}>
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
          <h2 className="font-display" style={{ margin: 0, fontWeight: 400, fontSize: 64, lineHeight: 1 }}>The exorcism</h2>
          <p style={{ margin: "16px 0 0", fontSize: 19, color: MUTED, lineHeight: 1.55 }}>
            A leaked key is not gone when you delete the line. These four steps are, in this order, what actually makes it harmless.
          </p>
        </div>
        <ol style={{ flex: "1 1 520px", minWidth: 0, margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 22 }}>
          {STEPS.map(([t, d], i) => (
            <li key={t} style={{ display: "flex", gap: 20 }}>
              <span style={{ flex: "none", width: 48, height: 48, borderRadius: 24, background: i === 0 ? "#F2B544" : "#33244A", color: i === 0 ? "#241604" : "#F3ECDD", fontWeight: 800, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i + 1}
              </span>
              <div>
                <div style={{ fontSize: 21, fontWeight: 800 }}>{t}</div>
                <div style={{ marginTop: 4, color: MUTED, fontSize: 16 }}>{d}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "120px 32px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center", background: "#22172F", border: "2px solid #33244A", borderRadius: 28, padding: 48 }}>
          <div style={{ flex: "1 1 380px", minWidth: 0 }}>
            <h2 className="font-display" style={{ margin: 0, fontWeight: 400, fontSize: 52, lineHeight: 1 }}>Built with Kiro, guarded by itself</h2>
            <p style={{ margin: "16px 0 0", color: MUTED, lineHeight: 1.6, fontSize: 18 }}>
              Specs shaped the scanner, steering keeps every secret masked, and a Kiro hook runs Haunted Repo on its own commits before they land.
            </p>
            <Link href="/hunt?demo=1" style={{ marginTop: 28, height: 54, display: "inline-flex", alignItems: "center", padding: "0 26px", borderRadius: 14, background: "#F2B544", color: "#241604", fontWeight: 800, fontSize: 17, textDecoration: "none" }}>
              Try the live demo
            </Link>
          </div>
          <pre className="font-mono" style={{ flex: "1 1 380px", minWidth: 0, margin: 0, background: "#160E22", border: "2px solid #33244A", borderRadius: 16, padding: 24, fontSize: 15, lineHeight: 1.75, color: MUTED, overflowX: "auto" }}>
            {`.kiro/
  specs/scanner-core/
  specs/creatures-ui/
  steering/security.md
  hooks/secret-check.kiro.hook
power/   (Kiro Power + MCP)`}
          </pre>
        </div>
      </section>

      <footer style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px 48px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", color: DIM, fontSize: 15 }}>
        <span>
          Haunted Repo, made for Kiroween 2026. MIT License.{" "}
          <a href="https://github.com/potionodevil/Kiroween---Haunted-Repo" style={{ color: DIM }}>Source</a>
        </span>
        <button type="button" onClick={() => setConfess((c) => !c)} style={{ padding: 0, border: 0, background: "none", color: DIM, font: "inherit", cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 4 }}>
          {confess ? "Okay, one. It was a test key." : "No ghosts were harmed. Only revoked."}
        </button>
      </footer>
    </div>
  );
}
