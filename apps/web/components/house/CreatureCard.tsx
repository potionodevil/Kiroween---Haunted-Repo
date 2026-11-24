import Link from "next/link";
import type { CSSProperties } from "react";
import { commentFor, type Finding, type Severity } from "@haunted/core";
import { KIND_LABEL, SEVERITY_LABEL, SEVERITY_SCALE } from "@/lib/sprites";
import { Sprite } from "@/components/Sprite";
import type { PrState } from "./ScanTerminal";

interface Props {
  finding: Finding;
  banished: boolean;
  pinned: boolean;
  onPick: (id: string) => void;
  /** Opens a pull request with just this fix. */
  onFix?: (f: Finding) => void;
  fixState?: PrState;
  ritualHref?: string;
}

/** Card colors per severity, from the design kit. */
export const LOOK: Record<Severity, { bg: string; border: string; bBg: string; bFg: string }> = {
  critical: { bg: "#33240F", border: "#F2B544", bBg: "#F2B544", bFg: "#241604" },
  warning: { bg: "#22172F", border: "#45345E", bBg: "#45345E", bFg: "#F3ECDD" },
  low: { bg: "#1C1229", border: "#33244A", bBg: "#2C2040", bFg: "#C2B6CF" },
};

export function badgeStyle(sev: Severity, fixed: boolean): CSSProperties {
  const L = LOOK[sev];
  return { fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: fixed ? "#16271B" : L.bBg, color: fixed ? "#BDEBC5" : L.bFg };
}

export function location(f: Finding): string {
  if (f.commit) return `${f.file} · ${f.commit}`;
  return f.line ? `${f.file}:${f.line}` : f.file;
}

export function accessibleName(f: Finding, banished: boolean): string {
  return `${KIND_LABEL[f.kind].one} · ${KIND_LABEL[f.kind].short}, ${SEVERITY_LABEL[f.severity]}, ${f.title}, ${location(f)}${banished ? ", fixed" : ""}`;
}

/** First changed lines of the patch, with the marker comment the PR will add. */
function preview(f: Finding): { sign: string; text: string }[] {
  if (!f.patch) return [];
  const out: { sign: string; text: string }[] = [];
  const c = commentFor(f.file);
  let marked = false;
  for (const l of f.patch.split("\n")) {
    if (l.startsWith("---") || l.startsWith("+++") || l.startsWith("@@") || !l) continue;
    if ((l[0] === "+" || l[0] === "-") && !marked && c && !f.patch.startsWith("--- /dev/null")) {
      const indent = /^\s*/.exec(l.slice(1))?.[0] ?? "";
      out.push({ sign: "+", text: c === "<!--" ? `${indent}<!-- haunted-repo: ${f.rule} -->` : `${indent}${c} haunted-repo: ${f.rule}` });
      marked = true;
    }
    out.push({ sign: l[0] ?? " ", text: l.slice(1) });
    if (out.length >= 9) break;
  }
  return out;
}

const SIGN: Record<string, string> = { "+": "#BDEBC5", "-": "#FF9B8A", " ": "#9C8FAE" };

export function CreatureCard({ finding: f, banished, pinned, onPick, onFix, fixState, ritualHref }: Props) {
  const L = LOOK[f.severity];
  const canFix = Boolean(f.autoFixable && f.patch && f.kind !== "ghost" && onFix);
  const lines = canFix ? preview(f) : [];
  const busy = fixState?.tone === "run";
  const sticky = busy;

  return (
    <div className={`cc${sticky ? " cc-open" : ""}`} style={{ position: "relative" }}>
      <button
        type="button"
        className="card3d"
        onClick={() => onPick(f.id)}
        onMouseEnter={() => onPick(f.id)}
        onFocus={() => onPick(f.id)}
        aria-label={accessibleName(f, banished)}
        aria-pressed={pinned}
        style={{
          width: "100%",
          textAlign: "left",
          background: L.bg,
          border: pinned ? "2px solid #F2B544" : `1px solid ${L.border}`,
          borderRadius: 16,
          padding: pinned ? 17 : 18,
          minHeight: 196,
          color: "#F3ECDD",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
        }}
      >
        <div className="hr-bob" style={{ height: 110, display: "flex", alignItems: "flex-end", justifyContent: "center", opacity: banished ? 0.25 : 1 }}>
          <Sprite kind={f.kind} scale={SEVERITY_SCALE[f.severity]} paused={banished} />
        </div>
        <div style={{ marginTop: 14, fontWeight: 700, fontSize: 16 }}>{f.title}</div>
        <div className="font-mono" style={{ marginTop: 4, fontSize: 12, color: "#C2B6CF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {location(f)}
        </div>
        <div style={{ marginTop: 12, alignSelf: "flex-start", ...badgeStyle(f.severity, banished) }}>{banished ? "Fixed" : SEVERITY_LABEL[f.severity]}</div>
      </button>

      {/* Hover popup: the fix, a preview of the change, and one click to put it in the repo. */}
      <div className="fixpop" role="group" aria-label={`Fix for ${f.title}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: "#F2B544", textTransform: "uppercase" }}>{KIND_LABEL[f.kind].one}</span>
          <span className="font-mono" style={{ marginLeft: "auto", fontSize: 11, color: "#9C8FAE" }}>{f.rule}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.45 }}>{f.fix}</p>

        {lines.length > 0 && (
          <pre className="font-mono" style={{ margin: "10px 0 0", padding: "8px 10px", borderRadius: 10, background: "#0F0918", border: "1px solid #33244A", fontSize: 11.5, lineHeight: 1.55, overflow: "hidden" }}>
            {lines.map((l, i) => (
              <div key={i} style={{ color: SIGN[l.sign] ?? "#C2B6CF", whiteSpace: "pre", overflow: "hidden", textOverflow: "ellipsis" }}>
                {l.sign} {l.text}
              </div>
            ))}
          </pre>
        )}

        {canFix ? (
          fixState?.url ? (
            <a href={fixState.url} target="_blank" rel="noreferrer" className="fixbtn" style={{ background: fixState.tone === "bad" ? "#F2B544" : "#9FD6A8", color: "#0F2414" }}>
              {fixState.text} ↗
            </a>
          ) : (
            <button type="button" className="fixbtn" disabled={busy || banished} onClick={() => onFix?.(f)} style={busy || banished ? { background: "#45345E", color: "#C2B6CF" } : undefined}>
              {busy ? "Opening a pull request…" : banished ? "Fixed" : "Fix it in the repo"}
            </button>
          )
        ) : f.kind === "ghost" && ritualHref ? (
          <Link href={ritualHref} className="fixbtn">Start the exorcism</Link>
        ) : (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#9C8FAE" }}>No safe auto-fix. The detail panel shows how to fix it by hand.</p>
        )}
        {fixState?.tone === "bad" && !fixState.url && <p role="alert" style={{ margin: "8px 0 0", fontSize: 12.5, color: "#FF9B8A" }}>{fixState.text}</p>}
        {canFix && !fixState && <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "#9C8FAE" }}>Opens a pull request. The changed line gets a haunted-repo comment.</p>}
      </div>
    </div>
  );
}
