"use client";
import { useEffect, useState } from "react";
import type { Finding } from "@haunted/core";
import { AiError, askAi, getAiSession, onAiSession, PROVIDERS } from "@/lib/client/ai";
import { SYSTEM_MEDIUM, mediumPrompt, type MediumAction } from "@/lib/ai-prompts";
import { demoMediumAnswer } from "@/lib/ai-demo";
import { CopyButton } from "@/components/house/CopyButton";
import { AiKeyForm } from "./AiKeyForm";

/** Set once the user has seen and accepted what an AI request contains, for this tab. */
let consented = false;

type State =
  | { s: "idle" }
  | { s: "preview"; action: MediumAction; user: string }
  | { s: "asking" }
  | { s: "answer"; text: string; sent?: string }
  | { s: "error"; message: string };

function extractDiff(text: string): string | null {
  const m = /```diff\n([\s\S]*?)```/.exec(text);
  return m ? m[1]! : null;
}

export function AiMedium({ finding, demo, revealMasked }: { finding: Finding; demo: boolean; revealMasked: boolean }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(getAiSession());
  const [state, setState] = useState<State>({ s: "idle" });
  const [question, setQuestion] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => onAiSession(() => setSession(getAiSession())), []);
  useEffect(() => setState({ s: "idle" }), [finding.id]);

  const run = async (action: MediumAction, user: string) => {
    setState({ s: "asking" });
    try {
      const text = await askAi({ system: SYSTEM_MEDIUM, user });
      setState({ s: "answer", text, sent: user });
    } catch (e) {
      setState({ s: "error", message: e instanceof AiError ? e.message : "Something went wrong." });
    }
    void action;
  };

  const start = (action: MediumAction) => {
    if (!session.hasKey) {
      if (demo) {
        setState({ s: "answer", text: demoMediumAnswer(action, finding, question) });
        return;
      }
      setShowKey(true);
      return;
    }
    const user = mediumPrompt(action, finding, revealMasked, question);
    if (!consented) setState({ s: "preview", action, user });
    else void run(action, user);
  };

  const btn = { height: 38, padding: "0 12px", borderRadius: 10, border: "1px solid #45345E", background: "transparent", color: "#F3ECDD", fontSize: 14, cursor: "pointer" } as const;
  const diff = state.s === "answer" ? extractDiff(state.text) : null;

  return (
    <section aria-label="AI medium" style={{ marginTop: 18, borderTop: "1px solid #33244A", paddingTop: 14 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ background: "none", border: 0, padding: 0, color: "#7FD6C9", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
        🔮 Ask the AI medium {open ? "▴" : "▾"}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: "#9C8FAE" }}>
            {session.hasKey ? `${PROVIDERS[session.provider].label} · ${session.model}` : demo ? "Demo: prepared answers. Add a key for a live model." : "Bring your own key to ask a model."}{" "}
            <button type="button" onClick={() => setShowKey((s) => !s)} style={{ background: "none", border: 0, padding: 0, color: "#C2B6CF", textDecoration: "underline", fontSize: 12, cursor: "pointer" }}>
              {session.hasKey ? "change key" : "add key"}
            </button>
          </div>
          {showKey && (
            <div style={{ marginTop: 10, border: "1px solid #33244A", borderRadius: 12, padding: 12 }}>
              <AiKeyForm onDone={() => setShowKey(false)} />
            </div>
          )}
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={btn} onClick={() => start("explain")}>Explain this</button>
            <button type="button" style={btn} onClick={() => start("fix")}>Draft a fix</button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) start("ask");
            }}
            style={{ marginTop: 8, display: "flex", gap: 6 }}
          >
            <label htmlFor={`q-${finding.id}`} className="sr-only">Question for the AI medium</label>
            <input id={`q-${finding.id}`} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a follow-up question" style={{ flex: 1, minWidth: 0, height: 38, padding: "0 10px", borderRadius: 10, border: "1px solid #45345E", background: "#160E22", color: "#F3ECDD" }} />
            <button type="submit" style={btn}>Ask</button>
          </form>

          <div aria-live="polite" style={{ marginTop: 12 }}>
            {state.s === "preview" && (
              <div style={{ border: "1px solid #F2B544", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>This is exactly what will be sent to {PROVIDERS[session.provider].label}:</div>
                <pre className="font-mono" style={{ marginTop: 8, maxHeight: 220, overflow: "auto", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#C2B6CF", background: "#160E22", padding: 10, borderRadius: 8 }}>
                  {`[system]\n${SYSTEM_MEDIUM}\n\n[user]\n${state.user}`}
                </pre>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9C8FAE" }}>No raw secret is included. Masked values only appear for repos you own or the demo.</p>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      consented = true;
                      void run(state.action, state.user);
                    }}
                    style={{ ...btn, background: "#F2B544", color: "#241604", border: 0, fontWeight: 700 }}
                  >
                    Send it
                  </button>
                  <button type="button" style={btn} onClick={() => setState({ s: "idle" })}>Cancel</button>
                </div>
              </div>
            )}
            {state.s === "asking" && <p style={{ color: "#C2B6CF", fontSize: 14 }}>The medium is listening…</p>}
            {state.s === "error" && <p role="alert" style={{ color: "#F2B544", fontSize: 14 }}>{state.message}</p>}
            {state.s === "answer" && (
              <div>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.55, color: "#F3ECDD" }}>{diff ? state.text.replace(/```diff\n[\s\S]*?```/, "[diff below]") : state.text}</div>
                {diff && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "flex-start", background: "#160E22", border: "1px solid #33244A", borderRadius: 10, padding: 10 }}>
                    <pre className="font-mono" style={{ margin: 0, flex: 1, minWidth: 0, overflowX: "auto", fontSize: 11, lineHeight: 1.5 }}>{diff}</pre>
                    <CopyButton text={diff} label="Copy diff" />
                  </div>
                )}
                {diff && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9C8FAE" }}>Nothing was applied. Review the diff, then apply it yourself.</p>}
                {state.sent && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ fontSize: 12, color: "#9C8FAE", cursor: "pointer" }}>What was sent</summary>
                    <pre className="font-mono" style={{ fontSize: 11, whiteSpace: "pre-wrap", color: "#9C8FAE" }}>{state.sent}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
