"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import type { Finding } from "@haunted/core";
import { KIND_COLOR, KIND_LABEL, SEVERITY_LABEL } from "@/lib/sprites";
import { measurement } from "@/lib/measure";
import { Sprite } from "@/components/Sprite";
import { badgeStyle } from "./CreatureCard";
import type { PrState } from "./ScanTerminal";

/**
 * A creature card that flies from its place in the grid to the front, framed like a trading card.
 * Below the card: what it means and how it was measured. Esc, the backdrop or "Close" sends it back.
 */
export function FocusCard({
  finding: f,
  from,
  banished,
  onClose,
  onFix,
  fixState,
  ritualHref,
  revealMasked,
}: {
  finding: Finding;
  from: DOMRect | null;
  banished: boolean;
  onClose: () => void;
  onFix: (f: Finding) => void;
  fixState?: PrState;
  ritualHref: string;
  revealMasked: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const color = KIND_COLOR[f.kind];
  const m = measurement(f);
  const canFix = Boolean(f.autoFixable && f.patch && f.kind !== "ghost");

  // Fly in: start at the grid card's box, end at the center (FLIP with the Web Animations API).
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || !from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = el.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const s = from.width / to.width;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotateY(0deg)`, opacity: 0.7 },
        { transform: "translate(0, -20px) scale(1.04) rotateY(-12deg)", opacity: 1, offset: 0.7 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  }, [from]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const frame = { "--kc": color } as CSSProperties;

  return (
    <div className="focus-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${KIND_LABEL[f.kind].one}: ${f.title}`} className="focus-wrap" onClick={(e) => e.stopPropagation()}>
        <div ref={cardRef} className="focus-card" style={frame}>
          <span className="fc-corner fc-tl" />
          <span className="fc-corner fc-tr" />
          <span className="fc-corner fc-bl" />
          <span className="fc-corner fc-br" />
          <div className="holo" style={{ opacity: 0.6, borderRadius: 14 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="font-display" style={{ fontSize: 26, color }}>{KIND_LABEL[f.kind].one}</span>
            <span style={{ marginLeft: "auto", ...badgeStyle(f.severity, banished) }}>{banished ? "Fixed" : SEVERITY_LABEL[f.severity]}</span>
          </div>
          <div className="hr-bob" style={{ height: 150, display: "flex", alignItems: "flex-end", justifyContent: "center", margin: "6px 0 10px", background: "radial-gradient(circle at 50% 70%, color-mix(in srgb, var(--kc) 22%, transparent), transparent 65%)" }}>
            <Sprite kind={f.kind} scale={1.2} paused={banished} />
          </div>
          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.25 }}>{f.title}</h2>
          <div className="font-mono" style={{ marginTop: 6, fontSize: 12, color: "#C2B6CF", wordBreak: "break-all" }}>
            {f.line ? `${f.file}:${f.line}` : f.file}
            {f.kind === "ghost" && (revealMasked && f.masked ? ` · ${f.masked}` : " · value hidden")}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: "#9C8FAE" }}>{KIND_LABEL[f.kind].meaning}</div>
        </div>

        <div className="focus-info">
          <section>
            <h3>What it means</h3>
            <p>{f.message}</p>
            {f.blastRadius && <p style={{ color: "#F2B544" }}>{f.blastRadius}</p>}
          </section>
          <section>
            <h3>How we measured it</h3>
            <p>{m.method}</p>
            <dl className="font-mono">
              {m.facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {m.evidence.length > 0 && (
              <ul className="font-mono">
                {m.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3>The fix</h3>
            <p>{f.fix}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {canFix &&
                (fixState?.url ? (
                  <a className="fixbtn" style={{ width: "auto", padding: "0 16px", marginTop: 0, background: "#9FD6A8", color: "#0F2414" }} href={fixState.url} target="_blank" rel="noreferrer">
                    {fixState.text} ↗
                  </a>
                ) : (
                  <button type="button" className="fixbtn" style={{ width: "auto", padding: "0 16px", marginTop: 0 }} disabled={banished || fixState?.tone === "run"} onClick={() => onFix(f)}>
                    {fixState?.tone === "run" ? "Opening a pull request…" : banished ? "Fixed" : "Fix it in the repo"}
                  </button>
                ))}
              {f.kind === "ghost" && (
                <Link className="fixbtn" style={{ width: "auto", padding: "0 16px", marginTop: 0 }} href={ritualHref}>
                  Start the exorcism
                </Link>
              )}
              <button ref={closeRef} type="button" onClick={onClose} style={{ height: 42, padding: "0 16px", borderRadius: 10, border: "1px solid #45345E", background: "transparent", color: "#F3ECDD", cursor: "pointer" }}>
                Close
              </button>
            </div>
            {fixState?.tone === "bad" && !fixState.url && <p role="alert" style={{ color: "#FF9B8A" }}>{fixState.text}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
