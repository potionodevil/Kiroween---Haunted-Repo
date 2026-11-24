"use client";
import Link from "next/link";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { score as calcScore, type CreatureKind, type Finding, type ScanResult } from "@haunted/core";
import { useBanished } from "@/lib/client/useBanished";
import { scanQuery } from "@/lib/client/session";
import { CreatureCard } from "./CreatureCard";
import { DetailPanel } from "./DetailPanel";
import { CopyButton } from "./CopyButton";
import { GhostMark } from "./GhostMark";
import { AttackPath } from "@/components/ai/AttackPath";
import { ScanTerminal, type PrState } from "./ScanTerminal";
import { Onboarding, useFirstVisit } from "./Onboarding";
import { FocusCard } from "./FocusCard";
import { HouseRoom } from "./HouseRoom";
import { loginHref, logout, useViewer } from "@/lib/client/viewer";

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

  const alive = useMemo(() => findings.filter((f) => !banished.has(f.id)), [findings, banished]);
  const count = (k: CreatureKind) => alive.filter((f) => f.kind === k).length;
  const autoFixable = alive.filter((f) => f.autoFixable && f.kind !== "ghost" && f.patch);
  const liveScore = calcScore(findings, banished);
  // Time machine (feature 8): creatures appear at introducedAt; findings without a date live at HEAD.
  const dates = useMemo(() => findings.map((f) => f.introducedAt).filter((d): d is string => Boolean(d)).sort(), [findings]);
  const [when, setWhen] = useState<number | null>(null);
  const span = dates.length > 1 ? { from: Date.parse(dates[0]!), to: Date.now() } : null;
  const atTime = (f: Finding) => when === null || !f.introducedAt || Date.parse(f.introducedAt) <= when;
  const timed = findings.filter((f) => atTime(f) && (when === null || f.introducedAt));
  const visible = (filter === "all" ? findings : findings.filter((f) => f.kind === filter)).filter((f) => when === null || timed.includes(f));
  const active = findings.find((f) => f.id === picked) ?? visible[0];

  const fixAll = () => {
    if (autoFixable.length === 0) return;
    setBulkPatch(autoFixable.map((f) => f.patch).join("\n"));
    banish(autoFixable.map((f) => f.id));
    dialogRef.current?.showModal();
  };
  const onBanish = (f: Finding) => banish([f.id]);

  const viewer = useViewer(demo ? null : result.repo);
  const [tour, setTour] = useFirstVisit();
  const [focus, setFocus] = useState<{ id: string; from: DOMRect } | null>(null);
  const focused = focus ? findings.find((f) => f.id === focus.id) : undefined;
  const [pr, setPr] = useState<PrState | null>(null);
  const [cardFix, setCardFix] = useState<Record<string, PrState>>({});
  // Auto-fix as a pull request: every changed spot gets a "haunted-repo:" comment (see /api/fix-pr).
  const sendFix = async (list: Finding[]): Promise<PrState> => {
    if (demo) {
      banish(list.map((f) => f.id));
      return { tone: "ok", text: `Pull request #48 opened (demo) · ${list.length} fix${list.length === 1 ? "" : "es"}` };
    }
    if (!viewer?.login) {
      location.href = loginHref(`/house?${q}&cached=1`);
      return { tone: "run", text: "Logging in with GitHub…" };
    }
    try {
      const res = await fetch("/api/fix-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: result.repo, mark: true, fixes: list.map((f) => ({ rule: f.rule, title: f.title, patch: f.patch })) }),
      });
      const d = (await res.json()) as { url?: string; number?: number; error?: string; installUrl?: string; skipped?: string[] };
      if (d.url) {
        banish(list.map((f) => f.id));
        return { tone: "ok", text: `Pull request #${d.number} opened${d.skipped?.length ? ` · ${d.skipped.length} skipped` : ""}`, url: d.url };
      }
      if (d.installUrl) return { tone: "bad", text: "Install the GitHub App first", url: d.installUrl };
      return { tone: "bad", text: d.error ?? `Failed (${res.status})` };
    } catch {
      return { tone: "bad", text: "Could not reach the server" };
    }
  };
  const fixPr = async () => {
    if (autoFixable.length === 0) return;
    setPr({ tone: "run", text: "opening a pull request…" });
    setPr(await sendFix(autoFixable));
  };
  const fixOne = async (f: Finding) => {
    setCardFix((m) => ({ ...m, [f.id]: { tone: "run", text: "" } }));
    const st = await sendFix([f]);
    setCardFix((m) => ({ ...m, [f.id]: st }));
  };

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
            {!demo && viewer?.configured && (viewer.login ? (
              <button type="button" onClick={() => void logout()} style={{ ...headerLink, background: "transparent", cursor: "pointer", fontSize: 14 }} title="Log out">
                @{viewer.login}{viewer.owner ? " · owner" : ""}
              </button>
            ) : (
              <a href={loginHref(`/house?${q}`)} style={{ ...headerLink, borderColor: "#F2B544", color: "#F2B544" }}>Log in with GitHub</a>
            ))}
            <button type="button" onClick={() => setTour(true)} aria-label="Show the tour" title="Show the tour" style={{ ...headerLink, width: 44, padding: 0, justifyContent: "center", background: "transparent", cursor: "pointer", fontWeight: 800 }}>?</button>
            <Link href={`/hunt?${q}`} style={headerLink}>Live hunt</Link>
            <Link href={`/seance?${q}`} style={headerLink}>Séance room</Link>
            <Link href={`/report?${q}`} style={headerLink}>Autopsy report</Link>
            <Link href="/" style={headerLink}>New scan</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px 64px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.5 }}>
            {alive.length === 0 ? "The house is quiet" : `${alive.length} creature${alive.length === 1 ? "" : "s"} haunt this repo`}
          </h1>
          <p style={{ margin: 0, color: "#9C8FAE", fontSize: 14 }}>Hover a creature for the fix, click it to bring it closer. Bigger creature, bigger risk.</p>
        </div>

        <HouseRoom findings={alive} total={alive.length} onOpen={(x, from) => setFocus({ id: x.id, from })} />

        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
          <section
            aria-label="Haunted house"
            className="wp"
            style={{ flex: "999 1 620px", minWidth: 0, border: "1px solid #33244A", borderRadius: 20, padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 18 }}
          >
            {visible.map((f) => (
              <CreatureCard key={f.id} finding={f} banished={banished.has(f.id)} pinned={active?.id === f.id} onPick={setPicked} onFix={(x) => void fixOne(x)} fixState={cardFix[f.id]} ritualHref={`/exorcism/${f.id}?${q}`} onOpen={(x, from) => setFocus({ id: x.id, from })} repo={result.repo} gitRef={result.defaultBranch} demo={demo} />
            ))}
            {visible.length === 0 && <p style={{ color: MUTED }}>No creatures of this kind.</p>}
          </section>
          <div style={{ flex: "1 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 16 }}>
            <ScanTerminal
              result={result}
              score={liveScore}
              count={count}
              filter={filter}
              onFilter={setFilter}
              fixable={autoFixable.length}
              onFixAll={fixAll}
              onFixPr={() => void fixPr()}
              prState={pr}
              login={viewer?.login ?? null}
            />
            <DetailPanel
              finding={active}
              banished={active ? banished.has(active.id) : false}
              onBanish={onBanish}
              ritualHref={active ? `/exorcism/${active.id}?${q}` : "#"}
              revealMasked={demo || Boolean(viewer?.owner)}
              repo={result.repo}
              demo={demo}
            />
          </div>
        </div>

        {span && (
          <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", background: "#22172F", border: "1px solid #33244A", borderRadius: 14, padding: "12px 16px" }}>
            <label htmlFor="time-machine" style={{ fontWeight: 700 }}>⏳ Time machine</label>
            <input
              id="time-machine"
              type="range"
              min={span.from}
              max={span.to}
              step={86_400_000}
              value={when ?? span.to}
              onChange={(e) => setWhen(Number(e.target.value) >= span.to - 86_400_000 ? null : Number(e.target.value))}
              style={{ flex: "1 1 260px", accentColor: "#F2B544" }}
              aria-valuetext={when === null ? "Now" : new Date(when).toDateString()}
            />
            <span className="font-mono" style={{ fontSize: 13, color: "#C2B6CF", minWidth: 120 }}>
              {when === null ? "now · all creatures" : `${new Date(when).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · ${timed.length} dated`}
            </span>
            {when !== null && (
              <button type="button" onClick={() => setWhen(null)} style={{ height: 34, padding: "0 12px", borderRadius: 8, border: "1px solid #45345E", background: "transparent", color: "#F3ECDD", cursor: "pointer" }}>
                Back to now
              </button>
            )}
          </div>
        )}

        <AttackPath findings={alive} demo={demo} onPick={setPicked} />
      </main>

      <Onboarding open={tour} onClose={() => setTour(false)} />
      {focused && focus && (
        <FocusCard
          finding={focused}
          from={focus.from}
          banished={banished.has(focused.id)}
          onClose={() => setFocus(null)}
          onFix={(x) => void fixOne(x)}
          fixState={cardFix[focused.id]}
          ritualHref={`/exorcism/${focused.id}?${q}`}
          revealMasked={demo || Boolean(viewer?.owner)}
        />
      )}
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
