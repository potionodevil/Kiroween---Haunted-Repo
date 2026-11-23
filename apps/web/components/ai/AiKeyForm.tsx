"use client";
import { useState } from "react";
import { PROVIDERS, setAiSession, type Provider } from "@/lib/client/ai";

const field = { height: 40, padding: "0 10px", borderRadius: 8, border: "1px solid #45345E", background: "#160E22", color: "#F3ECDD", fontSize: 14 } as const;

/** Key entry for the AI medium. The key is kept in memory for this tab only and never stored. */
export function AiKeyForm({ onDone }: { onDone?: () => void }) {
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [key, setKey] = useState("");
  const [model, setModel] = useState(PROVIDERS.anthropic.model);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!key.trim()) return;
        setAiSession({ provider, key, model: model.trim() || PROVIDERS[provider].model });
        setKey("");
        onDone?.();
      }}
      style={{ display: "grid", gap: 8 }}
    >
      <label style={{ fontSize: 13, color: "#C2B6CF" }}>
        Provider
        <select
          value={provider}
          onChange={(e) => {
            const p = e.target.value as Provider;
            setProvider(p);
            setModel(PROVIDERS[p].model);
          }}
          style={{ ...field, width: "100%", marginTop: 4 }}
        >
          {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
            <option key={p} value={p}>
              {PROVIDERS[p].label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: 13, color: "#C2B6CF" }}>
        API key
        <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={PROVIDERS[provider].keyHint} style={{ ...field, width: "100%", marginTop: 4 }} />
      </label>
      <label style={{ fontSize: 13, color: "#C2B6CF" }}>
        Model
        <input value={model} onChange={(e) => setModel(e.target.value)} className="font-mono" style={{ ...field, width: "100%", marginTop: 4 }} />
      </label>
      <button type="submit" disabled={!key.trim()} style={{ height: 42, borderRadius: 10, border: 0, background: "#F2B544", color: "#241604", fontWeight: 700, cursor: "pointer", opacity: key.trim() ? 1 : 0.5 }}>
        Use this key in this tab
      </button>
      <p style={{ margin: 0, fontSize: 12, color: "#9C8FAE" }}>
        The key stays in this tab&apos;s memory. It is never saved, logged or sent to Haunted Repo&apos;s servers{provider === "anthropic" ? "" : " (OpenAI and Mistral pass through a relay that stores nothing)"}. Closing the tab forgets it.
      </p>
    </form>
  );
}
