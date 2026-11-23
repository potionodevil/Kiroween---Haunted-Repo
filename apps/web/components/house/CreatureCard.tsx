import type { CSSProperties } from "react";
import type { Finding, Severity } from "@haunted/core";
import { KIND_LABEL, SEVERITY_LABEL, SEVERITY_SCALE } from "@/lib/sprites";
import { Sprite } from "@/components/Sprite";

interface Props {
  finding: Finding;
  banished: boolean;
  pinned: boolean;
  onPick: (id: string) => void;
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

export function CreatureCard({ finding: f, banished, pinned, onPick }: Props) {
  const L = LOOK[f.severity];
  return (
    <button
      type="button"
      className="card3d"
      onClick={() => onPick(f.id)}
      onMouseEnter={() => onPick(f.id)}
      onFocus={() => onPick(f.id)}
      aria-label={accessibleName(f, banished)}
      aria-pressed={pinned}
      style={{
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
  );
}
