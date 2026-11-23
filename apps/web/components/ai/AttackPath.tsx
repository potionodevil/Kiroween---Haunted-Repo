"use client";
import { useEffect, useState } from "react";
import type { Finding } from "@haunted/core";
import { AiError, askAi, getAiSession, onAiSession, PROVIDERS } from "@/lib/client/ai";
import { SYSTEM_ATTACK, attackPrompt, parseAttackPath, type AttackPath as Path } from "@/lib/ai-prompts";
import { demoAttackPath } from "@/lib/ai-demo";
import { Sprite } from "@/components/Sprite";
import { AiKeyForm } from "./AiKeyForm";

/** Feature 7: the AI links findings into an attacker's story, drawn as creatures joined by chains. */
export function AttackPath({ findings, demo, onPick }: { findings: Finding[]; demo: boolean; onPick: (id: string) => void }) {
  const [session, setSession] = useState(getAiSession());
  const [path, setPath] = useState<Path | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  useEffect(() => onAiSession(() => setSession(getAiSession())), []);

  const byId = new Map(findings.map((f) => [f.id, f]));
  const run = async () => {
    setPreview(false);
    setBusy(true);
    setError(null);
    try {
      const text = await askAi({ system: SYSTEM_ATTACK, user: attackPrompt(findings) });
      const p = parseAttackPath(text, findings);
      if (!p) throw new AiError("The answer was not a valid attack path. Try again.");
      setPath(p);
    } catch (e) {
      setError(e instanceof AiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  const start = () => {
    if (!session.hasKey && demo) setPath(demoAttackPath(findings));
    else if (session.hasKey) setPreview(true);
  };

  return (
    <section aria-label="Attack path" style={{ marginTop: 20, background: "#22172F", border: "1px solid #33244A", borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>⛓ Attack path</div>
          <div style={{ fontSize: 13, color: "#C2B6CF" }}>How an attacker could chain these creatures. Only findings that really connect are linked.</div>
        </div>
        <button type="button" onClick={start} disabled={busy || (!session.hasKey && !demo)} style={{ height: 42, padding: "0 16px", borderRadius: 10, border: "1px solid #F2B544", background: "transparent", color: "#F2B544", fontWeight: 700, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Tracing…" : path ? "Trace again" : "Show the attack path"}
        </button>
      </div>
      {!session.hasKey && !demo && (
        <div style={{ marginTop: 12, maxWidth: 420 }}>
          <AiKeyForm />
        </div>
      )}
      {preview && (
        <div style={{ marginTop: 12, border: "1px solid #F2B544", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>This is exactly what will be sent to {PROVIDERS[session.provider].label}:</div>
          <pre className="font-mono" style={{ marginTop: 8, maxHeight: 200, overflow: "auto", fontSize: 11, whiteSpace: "pre-wrap", color: "#C2B6CF" }}>{`[system]\n${SYSTEM_ATTACK}\n\n[user]\n${attackPrompt(findings)}`}</pre>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button type="button" onClick={() => void run()} style={{ height: 38, padding: "0 14px", borderRadius: 10, border: 0, background: "#F2B544", color: "#241604", fontWeight: 700, cursor: "pointer" }}>Send it</button>
            <button type="button" onClick={() => setPreview(false)} style={{ height: 38, padding: "0 14px", borderRadius: 10, border: "1px solid #45345E", background: "transparent", color: "#F3ECDD", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" style={{ color: "#F2B544" }}>{error}</p>}
      {path && (
        <div style={{ marginTop: 14 }} aria-live="polite">
          <div style={{ fontWeight: 700, color: "#F2B544" }}>{path.title}</div>
          {path.steps.length === 0 ? (
            <p style={{ color: "#C2B6CF" }}>No chain found. The creatures here do not connect into one attack.</p>
          ) : (
            <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 0 }}>
              {path.steps.map((s, i) => {
                const f = byId.get(s.id)!;
                return (
                  <li key={s.id} style={{ display: "flex", alignItems: "center" }}>
                    {i > 0 && (
                      <span aria-hidden="true" className="font-mono" style={{ color: "#9C8FAE", fontSize: 18, padding: "0 6px", letterSpacing: -2 }}>
                        ─o─o─
                      </span>
                    )}
                    <button type="button" onClick={() => onPick(f.id)} style={{ width: 190, textAlign: "left", background: "#1C1229", border: "1px solid #45345E", borderRadius: 14, padding: 12, color: "#F3ECDD", cursor: "pointer" }}>
                      <div style={{ height: 56, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                        <Sprite kind={f.kind} scale={0.45} />
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#9C8FAE" }}>Step {i + 1}</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</div>
                      <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4, color: "#C2B6CF" }}>{s.how}</div>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          {path.stop && (
            <p style={{ margin: "12px 0 0", padding: "10px 12px", borderRadius: 10, background: "#16271B", border: "1px solid #6FA878", color: "#BDEBC5", fontSize: 14 }}>
              Break the chain: {path.stop}
            </p>
          )}
          {!session.hasKey && demo && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9C8FAE" }}>Prepared demo answer. Add your key in a finding&apos;s AI medium for a live trace.</p>}
        </div>
      )}
    </section>
  );
}
