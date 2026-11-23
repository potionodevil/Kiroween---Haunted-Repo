"use client";
import { useState } from "react";
import { sha256Hex, type Finding } from "@haunted/core";
import { CopyButton } from "@/components/house/CopyButton";
import { Sprite } from "@/components/Sprite";

const AKIA = /^AKIA[0-9A-Z]{16}$/;

/**
 * Feature 30: after a ghost is exorcised, leave a friendly decoy in its place.
 * The user creates an AWS canary token at canarytokens.org themselves; we never create tokens for them.
 * The decoy is registered by hash in .haunted/decoys.json so the scanner ignores it.
 */
export function DecoyGhost({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const [keyId, setKeyId] = useState("");
  const valid = AKIA.test(keyId.trim());
  const file = `${finding.file.replace(/[^/]+$/, "")}decoy.aws-credentials`;
  const decoy = `# Haunted Repo decoy: a canary token. Using it only sends an alert.\n[default]\naws_access_key_id = ${keyId.trim()}\naws_secret_access_key = <paste the secret from canarytokens.org>\n`;
  const registry = JSON.stringify({ decoys: [{ sha256: valid ? sha256Hex(keyId.trim()) : "", file, note: "canarytokens.org AWS key" }] }, null, 2);

  return (
    <div style={{ marginTop: 22, borderRadius: 16, border: "1px dashed #7FD6C9", padding: 18 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 54, height: 60, overflow: "hidden", filter: "hue-rotate(120deg) saturate(1.4)" }}>
          <Sprite kind="ghost" scale={0.55} />
        </div>
        <div>
          <div style={{ fontWeight: 800 }}>Leave a friendly decoy ghost</div>
          <div style={{ fontSize: 14, color: "#C2B6CF" }}>Scrapers that steal keys from git history will grab it, and you get an alert the moment they try it.</div>
        </div>
      </div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={{ marginTop: 12, height: 44, padding: "0 16px", borderRadius: 10, border: "1px solid #7FD6C9", background: "transparent", color: "#7FD6C9", fontWeight: 700, cursor: "pointer" }}>
          Set up a decoy
        </button>
      ) : (
        <ol style={{ margin: "14px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.6, color: "#F3ECDD" }}>
          <li>
            Create a free <strong>AWS API key</strong> canary token at{" "}
            <a href="https://canarytokens.org/generate" target="_blank" rel="noreferrer" style={{ color: "#7FD6C9" }}>canarytokens.org</a> with an email for alerts.
          </li>
          <li>
            Paste the access key id here (starts with AKIA):{" "}
            <input value={keyId} onChange={(e) => setKeyId(e.target.value)} aria-label="Canary access key id" placeholder="AKIA…" className="font-mono" style={{ marginTop: 6, width: "100%", height: 40, padding: "0 10px", borderRadius: 8, border: "1px solid #45345E", background: "#160E22", color: "#F3ECDD" }} />
          </li>
          {valid && (
            <>
              <li>
                Commit this decoy as <code className="font-mono">{file}</code>:
                <div style={{ marginTop: 6, display: "flex", gap: 8, background: "#160E22", borderRadius: 8, padding: 10 }}>
                  <pre className="font-mono" style={{ margin: 0, flex: 1, fontSize: 12, whiteSpace: "pre-wrap" }}>{decoy}</pre>
                  <CopyButton text={decoy} />
                </div>
              </li>
              <li>
                Register it in <code className="font-mono">.haunted/decoys.json</code> so Haunted Repo shows it as friendly:
                <div style={{ marginTop: 6, display: "flex", gap: 8, background: "#160E22", borderRadius: 8, padding: 10 }}>
                  <pre className="font-mono" style={{ margin: 0, flex: 1, fontSize: 12, whiteSpace: "pre-wrap" }}>{registry}</pre>
                  <CopyButton text={registry} />
                </div>
              </li>
            </>
          )}
        </ol>
      )}
    </div>
  );
}
