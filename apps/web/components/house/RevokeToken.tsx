"use client";
import { useState } from "react";
import type { Finding } from "@haunted/core";

type State = { step: "idle" } | { step: "confirm" } | { step: "sending" } | { step: "done"; message: string } | { step: "error"; message: string };

/** Feature 12: one confirmed click sends a leaked GitHub token to GitHub's revocation endpoint. */
export function RevokeToken({ finding }: { finding: Finding }) {
  const [state, setState] = useState<State>({ step: "idle" });

  const send = async () => {
    setState({ step: "sending" });
    if (!finding.revokeHandle) {
      // demo repo: the token is invented, so the call is simulated
      await new Promise((r) => setTimeout(r, 900));
      setState({ step: "done", message: "Demo: GitHub would revoke this token now." });
      return;
    }
    try {
      const res = await fetch("/api/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: finding.revokeHandle, confirm: true }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      setState(res.ok ? { step: "done", message: data.message ?? "Revoked." } : { step: "error", message: data.error ?? "Revocation failed." });
    } catch {
      setState({ step: "error", message: "Could not reach the server." });
    }
  };

  const box = { marginTop: 14, borderRadius: 12, border: "1px solid #45345E", padding: 14, fontSize: 14 } as const;
  if (state.step === "done") return <div role="status" style={{ ...box, borderColor: "#6FA878", color: "#BDEBC5" }}>{state.message}</div>;
  if (state.step === "confirm" || state.step === "sending")
    return (
      <div role="alertdialog" aria-label="Confirm token revocation" style={box}>
        <p style={{ margin: 0, color: "#F3ECDD" }}>
          GitHub revokes the token for everyone, right away. This cannot be undone. Anything still using it will break.
        </p>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button type="button" onClick={() => void send()} disabled={state.step === "sending"} style={{ flex: 1, height: 42, borderRadius: 10, border: 0, background: "#F2B544", color: "#241604", fontWeight: 700, cursor: "pointer" }}>
            {state.step === "sending" ? "Banishing…" : "Yes, banish token"}
          </button>
          <button type="button" onClick={() => setState({ step: "idle" })} style={{ height: 42, padding: "0 14px", borderRadius: 10, border: "1px solid #45345E", background: "transparent", color: "#F3ECDD", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  return (
    <>
      <button
        type="button"
        onClick={() => setState({ step: "confirm" })}
        style={{ marginTop: 10, width: "100%", height: 48, borderRadius: 12, border: "1px solid #F2B544", background: "transparent", color: "#F2B544", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
      >
        Banish token
      </button>
      {state.step === "error" && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "#F2B544" }}>
          {state.message}
        </p>
      )}
    </>
  );
}
