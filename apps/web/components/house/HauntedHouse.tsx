"use client";
import Link from "next/link";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { CREATURE_KINDS, score as calcScore, scoreLabel, type CreatureKind, type Finding, type ScanResult } from "@haunted/core";
import { useBanished } from "@/lib/client/useBanished";
import { scanQuery } from "@/lib/client/session";
import { KIND_LABEL } from "@/lib/sprites";
import { Sprite } from "@/components/Sprite";
import { CreatureCard } from "./CreatureCard";
import { DetailPanel } from "./DetailPanel";
import { CopyButton } from "./CopyButton";
import { GhostMark } from "./GhostMark";

type Filter = "all" | CreatureKind;
const MUTED = "#C2B6CF";

export function HauntedHouse({ result, demo }: { result: ScanResult; demo: boolean }) {
  const { findings } = result;
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<string | null>(null);
  const { banished, banish } = useBanished(result.repo);
  const [bulkPatch, setBulkPatch] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const q = scanQuery(result.repo, demo);

  const KINDS = useMemo(() => CREATURE_KINDS.filter((k) => findings.some((f) => f.kind === k)), [findings]);
  const alive = useMemo(() => findings.filter((f) => !banished.has(f.id)), [findings, banished]);
  const count = (k: CreatureKind) => alive.filter((f) => f.kind === k).length;
  const autoFixable = alive.filter((f) => f.autoFixable && f.kind !== "ghost" && f.patch);
  const liveScore = calcScore(findings, banished);
  const visible = filter === "all" ? findings : findings.filter((f) => f.kind === filter);
  const active = findings.find((f) => f.id === picked) ?? visible[0];

  const fixAll = () => {
    if (autoFixable.length === 0) return;
    setBulkPatch(autoFixable.map((f) => f.patch).join("\n"));
    banish(autoFixable.map((f) => f.id));
    dialogRef.current?.showModal();
  };
  const onBanish = (f: Finding) => banish([f.id]);

  const chip = (on: boolean): CSSProperties => ({
    height: 44,
    padding: "0 16px",
    borderRadius: 22,
    fontSize: 15,
    cursor: "pointer",
    ...(on ? { background: "#F3ECDD", color: "#160E22", border: "1px solid #F3ECDD" } : { background: "transparent", color: MUTED, border: "1px solid #45345E" }),
  });
  const headerLink: CSSProperties = { height: 44, display: "inline-flex", alignItems: "center", padding: "0 16px", borderRadius: 10, border: "1px solid #45345E", color: "#F3ECDD", textDecoration: "none" };

  return (
    <div style={{ minHeight: "100vh", background: "#160E22", color: "#F3ECDD" }}>
      <header style={{ borderBottom: "1px solid #33244A" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 32px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <GhostMark />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: 14, color: MUTED }}>
            <span className="font-mono" style={{ background: "#22172F", border: "1px solid #33244A", borderRadius: 10, padding: "10px 14px" }}>
              github.com/{result.repo}
            </span>
            <button
              type="button"
              onClick={fixAll}
              disabled={autoFixable.length === 0}
              style={{ height: 44, padding: "0 16px", borderRadius: 10, border: `1px solid ${autoFixable.length ? "#F2B544" : "#45345E"}`, background: "transparent", color: autoFixable.length ? "#F2B544" : "#9C8FAE", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            >
              Fix all auto-fixable ({autoFixable.length})
            </button>
            <Link href={`/hunt?${q}`} style={headerLink}>Live hunt</Link>
            <Link href={`/seance?${q}`} style={headerLink}>Séance room</Link>
            <Link href={`/report?${q}`} style={headerLink}>Autopsy report</Link>
            <Link href="/" style={headerLink}>New scan</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 32px 64px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "stretch" }}>
          <div style={{ flex: "1 1 300px", background: "#22172F", border: "1px solid #33244A", borderRadius: 18, padding: 28, display: "flex", gap: 24, alignItems: "center" }}>
            <div
              role="img"
              aria-label={`Haunting score ${liveScore} of 100`}
              style={{ width: 120, height: 120, flex: "none", borderRadius: 60, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .4s", background: `conic-gradient(#F2B544 ${liveScore}%, #33244A 0)` }}
            >
              <div style={{ width: 100, height: 100, borderRadius: 50, background: "#22172F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{liveScore}</span>
                <span style={{ fontSize: 12, color: MUTED }}>/ 100</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 15, color: "#F2B544" }}>Haunting score</div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>{scoreLabel(liveScore)}</div>
              <div style={{ color: MUTED, fontSize: 15, marginTop: 6 }}>
                {result.commitsScanned} commits · {result.filesScanned} files · {(result.durationMs / 1000).toFixed(1)} s{result.partial ? " · partial" : ""}
              </div>
            </div>
          </div>
          <div style={{ flex: "2 1 560px", display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 10 }}>
            {CREATURE_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => KINDS.includes(k) && setFilter(k)}
                aria-label={`${count(k)} ${KIND_LABEL[k].many}, ${KIND_LABEL[k].meaning}`}
                style={{ background: "#22172F", border: "1px solid #33244A", borderRadius: 14, padding: "10px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#F3ECDD", cursor: KINDS.includes(k) ? "pointer" : "default" }}
              >
                <div style={{ height: 46, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <Sprite kind={k} scale={0.4} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{count(k)}</div>
                <div style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>{KIND_LABEL[k].short}</div>
              </button>
            ))}
          </div>
        </div>

        {result.notes.length > 0 && (
          <ul style={{ margin: "16px 0 0", padding: "12px 18px", listStyle: "none", border: "1px solid #33244A", borderRadius: 14, color: MUTED, fontSize: 14 }}>
            {result.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: 32, letterSpacing: -0.5 }}>
            {alive.length === 0 ? "The house is quiet" : `${alive.length} creature${alive.length === 1 ? "" : "s"} haunt this repo`}
          </h1>
          <div role="group" aria-label="Filter findings" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["all", ...KINDS] as Filter[]).map((k) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} style={chip(filter === k)}>
                {k === "all" ? `All ${alive.length}` : `${KIND_LABEL[k].many} ${count(k)}`}
              </button>
            ))}
          </div>
        </div>
        <p style={{ margin: "10px 0 0", color: "#9C8FAE", fontSize: 15 }}>
          {KINDS.length > 1 ? `${KINDS.length === 10 ? "Ten" : KINDS.length} kinds of creatures, one scan. ` : ""}Hover a creature for the fix. Click it to pin it. Bigger creature, bigger risk.
        </p>

        <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
          <section
            aria-label="Haunted house"
            className="wp"
            style={{ flex: "999 1 620px", minWidth: 0, border: "1px solid #33244A", borderRadius: 20, padding: 28, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 18 }}
          >
            {visible.map((f) => (
              <CreatureCard key={f.id} finding={f} banished={banished.has(f.id)} pinned={active?.id === f.id} onPick={setPicked} />
            ))}
            {visible.length === 0 && <p style={{ color: MUTED }}>No creatures of this kind.</p>}
          </section>
          <div style={{ flex: "1 1 340px", minWidth: 0, position: "sticky", top: 16 }}>
            <DetailPanel
              finding={active}
              banished={active ? banished.has(active.id) : false}
              onBanish={onBanish}
              ritualHref={active ? `/exorcism/${active.id}?${q}` : "#"}
              revealMasked={demo}
              repo={result.repo}
            />
          </div>
        </div>
      </main>

      <dialog ref={dialogRef} className="m-auto w-[min(640px,92vw)] rounded-2xl border border-dust bg-crypt p-0 text-bone backdrop:bg-plum-night/80">
        <div className="p-5">
          <h2 className="text-lg font-bold">Laid to rest</h2>
          <p className="mt-1 text-sm text-bone/70">
            Apply this patch with <code className="font-mono">git apply</code> to make it stick.
          </p>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-plum-night p-3 font-mono text-[11px] leading-relaxed">{bulkPatch}</pre>
          <div className="mt-4 flex justify-end gap-2">
            {bulkPatch && <CopyButton text={bulkPatch} label="Copy patch" />}
            <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-md bg-lantern px-3 py-1 text-xs font-semibold text-plum-night">
              Close
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
