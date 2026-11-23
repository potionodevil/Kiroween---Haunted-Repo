"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { Finding } from "@haunted/core";
import { KIND_LABEL, SEVERITY_LABEL } from "@/lib/sprites";
import { CopyButton } from "./CopyButton";
import { badgeStyle, location } from "./CreatureCard";
import { DisclosureDraft } from "./DisclosureDraft";
import { RevokeToken } from "./RevokeToken";

interface Props {
  finding: Finding | undefined;
  banished: boolean;
  onBanish: (f: Finding) => void;
  ritualHref: string;
  /** Masked values only for the demo or a proven owner (security.md rule 8). */
  revealMasked: boolean;
  repo: string;
}

const MUTED = "#C2B6CF";
const MONO: CSSProperties = { fontSize: 12, color: MUTED, border: "1px solid #45345E", borderRadius: 20, padding: "4px 10px" };

export function DetailPanel({ finding: f, banished, onBanish, ritualHref, revealMasked, repo }: Props) {
  const [showPatch, setShowPatch] = useState(false);
  if (!f) {
    return (
      <aside style={{ background: "#22172F", border: "1px solid #45345E", borderRadius: 20, padding: 26, color: MUTED }}>
        Hover a creature to read its finding.
      </aside>
    );
  }
  const isGhost = f.kind === "ghost";
  const canFix = f.autoFixable && Boolean(f.patch);
  const primary: CSSProperties = { marginTop: 22, width: "100%", height: 52, border: 0, borderRadius: 12, background: "#F2B544", color: "#241604", fontWeight: 700, fontSize: 16, cursor: "pointer" };
  const secondary: CSSProperties = { marginTop: 10, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, border: "1px solid #45345E", color: "#F3ECDD", textDecoration: "none", fontSize: 15, background: "transparent", width: "100%", cursor: "pointer" };

  return (
    <aside aria-label="Selected finding" aria-live="polite" style={{ background: "#22172F", border: "1px solid #45345E", borderRadius: 20, padding: 26 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={badgeStyle(f.severity, false)}>{SEVERITY_LABEL[f.severity]}</span>
        <span className="font-mono" style={MONO}>
          {KIND_LABEL[f.kind].one} · {KIND_LABEL[f.kind].short}
        </span>
        <span className="font-mono" style={{ fontSize: 12, color: "#9C8FAE" }}>{f.rule}</span>
      </div>
      <h2 style={{ margin: "12px 0 0", fontSize: 24 }}>{f.title}</h2>
      <p style={{ margin: "10px 0 0", color: MUTED, fontSize: 15, lineHeight: 1.55 }}>{f.message}</p>
      <div className="font-mono" style={{ marginTop: 16, fontSize: 13, background: "#160E22", border: "1px solid #33244A", borderRadius: 10, padding: "12px 14px", wordBreak: "break-all" }}>
        {location(f)}
        {isGhost && (
          <div style={{ marginTop: 6, color: "#9C8FAE" }}>{revealMasked && f.masked ? f.masked : "Value hidden: not proven to be your repo"}</div>
        )}
        {f.dependencyPath && f.dependencyPath.length > 0 && (
          <ol style={{ margin: "8px 0 0", padding: 0, listStyle: "none", color: "#9C8FAE" }} aria-label="Dependency path">
            {f.dependencyPath.map((p, i) => (
              <li key={p} style={{ paddingLeft: i * 14 }}>
                {i > 0 ? "└ " : ""}
                {p}
              </li>
            ))}
          </ol>
        )}
      </div>

      {(f.cwe || f.owasp || f.confidence) && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {f.cwe && <span className="font-mono" style={MONO}>{f.cwe}</span>}
          {f.owasp && <span className="font-mono" style={MONO}>OWASP {f.owasp}</span>}
          {f.confidence && <span style={MONO}>Confidence: {f.confidence}</span>}
        </div>
      )}

      {f.blastRadius && (
        <>
          <div style={{ marginTop: 18, fontSize: 15, fontWeight: 700 }}>If someone abuses it</div>
          <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: 1.5, color: MUTED }}>{f.blastRadius}</p>
        </>
      )}
      {f.evidence && f.evidence.length > 0 && !isGhost && (
        <>
          <div style={{ marginTop: 18, fontSize: 15, fontWeight: 700 }}>Evidence</div>
          <ul className="font-mono" style={{ margin: "6px 0 0", padding: 0, listStyle: "none", fontSize: 12, color: MUTED }}>
            {f.evidence.slice(0, 5).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}

      <div style={{ marginTop: 18, fontSize: 15, fontWeight: 700, color: "#F2B544" }}>Suggested fix</div>
      <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.55 }}>{f.fix}</p>

      {f.patch && (
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => setShowPatch((s) => !s)} style={{ background: "none", border: 0, color: MUTED, fontSize: 13, padding: 0, cursor: "pointer", textDecoration: "underline" }}>
            {showPatch ? "Hide the diff" : "Show the diff before fixing"}
          </button>
          {showPatch && (
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start", background: "#160E22", border: "1px solid #33244A", borderRadius: 10, padding: 10 }}>
              <pre className="font-mono" style={{ margin: 0, flex: 1, minWidth: 0, overflowX: "auto", fontSize: 11, lineHeight: 1.5, color: MUTED }}>{f.patch}</pre>
              <CopyButton text={f.patch} />
            </div>
          )}
        </div>
      )}

      {f.references && f.references.length > 0 && (
        <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", fontSize: 12 }}>
          {f.references.slice(0, 3).map((r) => (
            <li key={r} style={{ wordBreak: "break-all" }}>
              <a href={r} target="_blank" rel="noreferrer" style={{ color: MUTED }}>{r}</a>
            </li>
          ))}
        </ul>
      )}

      {banished ? (
        <div style={{ marginTop: 22, minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "8px 12px", borderRadius: 12, background: "#16271B", border: "1px solid #6FA878", color: "#BDEBC5", fontWeight: 700 }}>
          {isGhost ? "Laid to rest. Marked as exorcised." : canFix ? "Laid to rest. Apply the diff to make it stick." : "Laid to rest."}
        </div>
      ) : (
        <button type="button" onClick={() => onBanish(f)} style={primary}>
          {isGhost ? "Mark as exorcised" : canFix ? "Fix it now" : "I fixed it by hand"}
        </button>
      )}
      {isGhost && (
        <Link href={ritualHref} style={secondary}>
          Open the exorcism ritual
        </Link>
      )}
      {isGhost && f.rule === "secret/github-token" && !banished && <RevokeToken finding={f} />}
      {isGhost && !revealMasked && <DisclosureDraft finding={f} repo={repo} />}
    </aside>
  );
}
