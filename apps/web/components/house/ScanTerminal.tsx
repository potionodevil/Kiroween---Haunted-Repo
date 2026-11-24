"use client";
import { CREATURE_KINDS, scoreLabel, type CreatureKind, type ScanResult } from "@haunted/core";
import { KIND_LABEL } from "@/lib/sprites";

/**
 * The scan summary drawn as a real command line: score bar, creature counts (clickable filters),
 * notes and the next commands. Monospace, prompt, blinking caret.
 */
export interface PrState {
  tone: "run" | "ok" | "bad";
  text: string;
  url?: string;
}

const C = { prompt: "#9FD6A8", path: "#7FD6C9", dim: "#9C8FAE", text: "#F3ECDD", gold: "#F2B544", bad: "#FF9B8A" };

export function ScanTerminal({
  result,
  score,
  count,
  filter,
  onFilter,
  fixable,
  onFixAll,
  onFixPr,
  prState,
  login,
}: {
  result: ScanResult;
  score: number;
  count: (k: CreatureKind) => number;
  filter: "all" | CreatureKind;
  onFilter: (k: "all" | CreatureKind) => void;
  fixable: number;
  onFixAll: () => void;
  onFixPr: () => void;
  prState: PrState | null;
  login: string | null;
}) {
  const filled = Math.round(score / 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  const total = CREATURE_KINDS.reduce((n, k) => n + count(k), 0);
  const Prompt = ({ cmd }: { cmd: string }) => (
    <div>
      <span style={{ color: C.prompt }}>{login ?? "you"}@haunted</span>:<span style={{ color: C.path }}>~</span>$ <span style={{ color: C.text }}>{cmd}</span>
    </div>
  );
  const btn = { background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer", textAlign: "left" as const };

  return (
    <section aria-label="Scan summary" className="font-mono" style={{ background: "#0F0918", border: "2px solid #33244A", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 50px #00000055" }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #33244A", background: "#1C1229" }}>
        {["#FF9B8A", "#F2B544", "#9FD6A8"].map((c) => (
          <span key={c} style={{ width: 11, height: 11, borderRadius: 6, background: c, opacity: 0.7 }} />
        ))}
        <span style={{ marginLeft: 6, fontSize: 12, color: C.dim }}>haunted-repo — zsh</span>
      </div>
      <div style={{ padding: "14px 16px", fontSize: 13, lineHeight: 1.75, color: C.dim }}>
        <Prompt cmd={`npx haunted-repo scan ${result.repo}`} />
        <div style={{ color: C.prompt }}>
          ✔ {result.commitsScanned} commits · {result.filesScanned} files · {(result.durationMs / 1000).toFixed(1)} s{result.partial ? " · partial" : ""}
        </div>
        <div style={{ marginTop: 6 }}>
          <span style={{ color: C.text }}>haunting score </span>
          <span style={{ color: score > 60 ? C.bad : C.gold, fontWeight: 700 }}>{String(score).padStart(3)}/100 </span>
          <span aria-hidden="true" style={{ color: score > 60 ? C.bad : C.gold }}>{bar}</span>
          <div style={{ color: C.text }}>                {scoreLabel(score)}</div>
        </div>

        <div role="group" aria-label="Filter creatures" style={{ marginTop: 8 }}>
          <button type="button" onClick={() => onFilter("all")} aria-pressed={filter === "all"} style={{ ...btn, color: filter === "all" ? C.gold : C.dim, display: "block" }}>
            {filter === "all" ? "›" : " "} all{" ".repeat(11)}{String(total).padStart(3)}
          </button>
          {CREATURE_KINDS.map((k) => {
            const n = count(k);
            return (
              <button
                key={k}
                type="button"
                disabled={n === 0}
                onClick={() => onFilter(k)}
                aria-pressed={filter === k}
                aria-label={`${n} ${KIND_LABEL[k].many}, ${KIND_LABEL[k].meaning}`}
                style={{ ...btn, display: "block", color: filter === k ? C.gold : n ? C.text : "#5A4D6E", cursor: n ? "pointer" : "default" }}
              >
                {filter === k ? "›" : " "} {KIND_LABEL[k].many.toLowerCase().padEnd(13)}{String(n).padStart(3)}  <span style={{ color: C.dim }}>{KIND_LABEL[k].meaning}</span>
              </button>
            );
          })}
        </div>

        {result.notes.map((n) => (
          <div key={n} style={{ color: C.gold }}>! {n}</div>
        ))}

        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={onFixAll} disabled={fixable === 0} style={{ ...btn, color: fixable ? C.text : "#5A4D6E" }}>
            <span style={{ color: C.prompt }}>$</span> haunted-repo fix --all <span style={{ color: C.dim }}># {fixable} auto-fixable → patch to copy</span>
          </button>
        </div>
        <div>
          <button type="button" onClick={onFixPr} disabled={fixable === 0} style={{ ...btn, color: fixable ? C.text : "#5A4D6E" }}>
            <span style={{ color: C.prompt }}>$</span> haunted-repo fix --pr <span style={{ color: C.dim }}># open a pull request</span>
          </button>
        </div>
        {prState && (
          <div role="status" style={{ color: prState.tone === "bad" ? C.bad : prState.tone === "ok" ? C.prompt : C.gold, whiteSpace: "pre-wrap" }}>
            {prState.tone === "bad" ? "✖ " : prState.tone === "ok" ? "✔ " : "… "}
            {prState.url ? (
              <a href={prState.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                {prState.text}
              </a>
            ) : (
              prState.text
            )}
          </div>
        )}
        <div>
          <span style={{ color: C.prompt }}>{login ?? "you"}@haunted</span>:<span style={{ color: C.path }}>~</span>$ <span className="caret" style={{ color: C.text }}>▌</span>
        </div>
      </div>
    </section>
  );
}
