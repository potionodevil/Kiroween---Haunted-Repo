"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CREATURE_KINDS, type CreatureKind, type Finding, type ScanResult } from "@haunted/core";
import { useBanished } from "@/lib/client/useBanished";
import { scanQuery } from "@/lib/client/session";
import { score as calcScore, scoreLabel } from "@haunted/core";
import { KIND_LABEL } from "@/lib/sprites";
import { Logo } from "@/components/Logo";
import { Sprite } from "@/components/Sprite";
import { ScoreRing } from "./ScoreRing";
import { CreatureCard } from "./CreatureCard";
import { DetailPanel } from "./DetailPanel";
import { CopyButton } from "./CopyButton";

type Filter = "all" | CreatureKind;

export function HauntedHouse({ result, demo }: { result: ScanResult; demo: boolean }) {
  const { findings } = result;
  const [filter, setFilter] = useState<Filter>("all");
  const [pinned, setPinned] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const { banished, banish } = useBanished(result.repo);
  const [bulkPatch, setBulkPatch] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const q = scanQuery(result.repo, demo);

  /** Only kinds that appear in this scan get a counter and a filter chip. */
  const KINDS = useMemo(() => CREATURE_KINDS.filter((k) => findings.some((f) => f.kind === k)), [findings]);
  const alive = useMemo(() => findings.filter((f) => !banished.has(f.id)), [findings, banished]);
  const count = (k: CreatureKind) => alive.filter((f) => f.kind === k).length;
  const autoFixable = alive.filter((f) => f.autoFixable && f.kind !== "ghost" && f.patch);
  const liveScore = calcScore(findings, banished);
  const visible = filter === "all" ? findings : findings.filter((f) => f.kind === filter);
  const activeId = hovered ?? pinned ?? visible[0]?.id ?? null;
  const active = findings.find((f) => f.id === activeId);

  const fixAll = () => {
    if (autoFixable.length === 0) return;
    setBulkPatch(autoFixable.map((f) => f.patch).join("\n"));
    banish(autoFixable.map((f) => f.id));
    dialogRef.current?.showModal();
  };

  const onBanish = (f: Finding) => banish([f.id]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-dust px-3 py-2 font-mono text-xs text-bone/75">
            github.com/{result.repo}
          </span>
          <button
            type="button"
            onClick={fixAll}
            disabled={autoFixable.length === 0}
            className="rounded-lg border border-lantern px-3 py-2 text-sm font-semibold text-lantern disabled:border-dust disabled:text-bone/40"
          >
            Fix all auto-fixable ({autoFixable.length})
          </button>
          <Link href={`/hunt?${q}`} className="rounded-lg border border-dust px-3 py-2 text-sm hover:border-bone/50">
            Live hunt
          </Link>
          <Link href="/" className="rounded-lg border border-dust px-3 py-2 text-sm hover:border-bone/50">
            New scan
          </Link>
        </div>
      </header>

      <section aria-label="Summary" className="grid gap-3 lg:grid-cols-[1fr_1.45fr]">
        <div className="flex items-center gap-6 rounded-2xl border border-dust bg-crypt p-6">
          <ScoreRing score={liveScore} />
          <div>
            <div className="text-sm text-lantern">Haunting score</div>
            <div className="text-2xl font-bold">{scoreLabel(liveScore)}</div>
            <div className="text-sm text-bone/70">
              {result.commitsScanned} commits · {result.filesScanned} files · {(result.durationMs / 1000).toFixed(1)} s
              {result.partial && " · partial"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              aria-label={`${count(k)} ${KIND_LABEL[k].many}: ${KIND_LABEL[k].meaning}. Show only these.`}
              className="flex flex-col items-center justify-end gap-1 rounded-xl border border-dust bg-crypt px-2 pb-2 pt-3 hover:border-bone/40"
            >
              <span className="flex h-9 items-center">
                <Sprite kind={k} scale={0.3} paused />
              </span>
              <span className="text-xl font-bold tabular-nums">{count(k)}</span>
              <span className="text-[11px] text-bone/70">{KIND_LABEL[k].short}</span>
            </button>
          ))}
        </div>
      </section>

      {result.notes.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl border border-dust/70 px-4 py-3 text-sm text-bone/75">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <h1 className="mt-12 text-3xl font-bold">
        {alive.length === 0 ? "The house is quiet" : `${alive.length} creature${alive.length === 1 ? "" : "s"} haunt this repo`}
      </h1>
      <div role="group" aria-label="Filter creatures" className="mt-4 flex flex-wrap gap-2">
        {(["all", ...KINDS] as Filter[]).map((k) => {
          const n = k === "all" ? alive.length : count(k);
          const label = k === "all" ? "All" : KIND_LABEL[k].many;
          const on = filter === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(k)}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${on ? "border-bone bg-bone text-plum-night" : "border-dust text-bone/80 hover:border-bone/50"}`}
            >
              {label} {n}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-bone/60">
        {KINDS.length > 1 ? `${KINDS.length} kinds of creatures, one scan. ` : ""}Hover a creature for the fix. Click it to pin it. Bigger creature, bigger risk.
      </p>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="bg-diamonds grid gap-3 rounded-2xl border border-dust/60 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((f) => (
            <CreatureCard
              key={f.id}
              finding={f}
              banished={banished.has(f.id)}
              pinned={pinned === f.id}
              onHover={setHovered}
              onPin={(id) => setPinned((p) => (p === id ? null : id))}
            />
          ))}
          {visible.length === 0 && <p className="p-6 text-bone/60">No creatures of this kind.</p>}
        </div>
        <div className="lg:sticky lg:top-4">
          <DetailPanel
            finding={active}
            banished={active ? banished.has(active.id) : false}
            onBanish={onBanish}
            ritualHref={active ? `/exorcism/${active.id}?${q}` : "#"}
            revealMasked={demo}
          />
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(640px,92vw)] rounded-2xl border border-dust bg-crypt p-0 text-bone backdrop:bg-plum-night/80"
      >
        <div className="p-5">
          <h2 className="text-lg font-bold">Laid to rest</h2>
          <p className="mt-1 text-sm text-bone/70">Apply this patch with <code className="font-mono">git apply</code> to make it stick.</p>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-plum-night p-3 font-mono text-[11px] leading-relaxed">{bulkPatch}</pre>
          <div className="mt-4 flex justify-end gap-2">
            {bulkPatch && <CopyButton text={bulkPatch} label="Copy patch" />}
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md bg-lantern px-3 py-1 text-xs font-semibold text-plum-night"
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
