"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Finding } from "@haunted/core";
import type { GateContext } from "@/components/ScanGate";
import { buildRitual, type StepId } from "@haunted/core";
import { loadSteps, saveSteps, scanQuery } from "@/lib/client/session";
import { useBanished } from "@/lib/client/useBanished";
import { Sprite } from "@/components/Sprite";
import { SeverityBadge } from "@/components/house/SeverityBadge";
import { CopyButton } from "@/components/house/CopyButton";
import { SEVERITY_LABEL } from "@/lib/sprites";

type Check = { state: "idle" } | { state: "checking" } | { state: "gone" } | { state: "still"; commits: number };

function fmtDate(iso: string | null): string {
  if (!iso) return "Unknown date";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function Ritual({ id, ctx }: { id: string; ctx: GateContext }) {
  const { result, demo, rescan } = ctx;
  const q = scanQuery(result.repo, demo);
  const back = `/house?${q}&cached=1`;
  const ghost = result.findings.find((f) => f.id === id && f.kind === "ghost");
  const { banished, banish } = useBanished(result.repo);
  const [done, setDone] = useState<Set<StepId>>(new Set());
  const [check, setCheck] = useState<Check>({ state: "idle" });

  useEffect(() => {
    setDone(loadSteps(result.repo, id) as Set<StepId>);
  }, [result.repo, id]);

  if (!ghost) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-lg">This creature needs no ritual. Only ghosts (leaked secrets) do.</p>
        <Link href={back} className="mt-6 inline-block text-lantern underline underline-offset-4">
          Back to the haunted house
        </Link>
      </main>
    );
  }

  const steps = buildRitual(ghost);
  const laid = banished.has(ghost.id) || check.state === "gone";

  const toggle = (step: StepId) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      saveSteps(result.repo, id, next);
      return next;
    });
  };

  const confirm = async () => {
    setCheck({ state: "checking" });
    if (demo) {
      // Demo repo cannot really change. Simulate: gone once all 4 steps are ticked.
      await new Promise((r) => setTimeout(r, 1200));
      if (done.size === steps.length) {
        banish([ghost.id]);
        setCheck({ state: "gone" });
      } else {
        setCheck({ state: "still", commits: ghost.ghost?.commitCount ?? 1 });
      }
      return;
    }
    const fresh = await rescan();
    const still = fresh?.findings.find((f) => f.id === ghost.id);
    if (fresh && !still) {
      banish([ghost.id]);
      setCheck({ state: "gone" });
    } else {
      setCheck({ state: "still", commits: still?.ghost?.commitCount ?? ghost.ghost?.commitCount ?? 1 });
    }
  };

  const missing = steps.find((s) => !done.has(s.id));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href={back} className="text-sm text-bone/75 hover:text-bone">‹ Back to the haunted house</Link>
        <span className="font-display text-2xl">Haunted Repo</span>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-6">
          <GhostCard f={ghost} laid={laid} />
          <Timeline f={ghost} />
        </aside>

        <section aria-labelledby="ritual-title" className="rounded-2xl border border-dust bg-crypt p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs text-lantern">The exorcism ritual</div>
              <h1 id="ritual-title" className="text-2xl font-bold">
                {done.size} of {steps.length} steps done
              </h1>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={done.size}
              aria-label="Ritual progress"
              className="h-2 w-40 overflow-hidden rounded-full bg-dust"
            >
              <div className="h-full bg-lantern transition-[width] duration-500" style={{ width: `${(done.size / steps.length) * 100}%` }} />
            </div>
          </div>

          <ol className="mt-6 space-y-3">
            {steps.map((s) => {
              const on = done.has(s.id);
              return (
                <li key={s.id} className={`rounded-xl border p-4 ${on ? "border-zombie/40 bg-zombie/8" : "border-dust bg-plum-night/40"}`}>
                  <label className="flex cursor-pointer gap-3">
                    <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="mt-1 size-4 accent-[var(--color-lantern)]" />
                    <span>
                      <span className="block font-semibold">{s.title}</span>
                      <span className="mt-0.5 block text-sm text-bone/70">{s.body}</span>
                    </span>
                  </label>
                  {s.command && (
                    <div className="mt-3 ml-7 flex items-start gap-2 rounded-lg bg-plum-night p-3">
                      <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-bone/85">{s.command}</pre>
                      <CopyButton text={s.command} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={check.state === "checking"}
              className="rounded-lg bg-lantern px-4 py-2.5 font-semibold text-plum-night disabled:opacity-60"
            >
              {check.state === "checking" ? "Rescanning…" : "Rescan to confirm it's gone"}
            </button>
            <button type="button" disabled title="Needs GitHub sign-in (later)" className="rounded-lg border border-dust px-4 py-2.5 text-bone/45">
              Open fix branch as PR
            </button>
          </div>

          <div aria-live="polite" className="mt-4">
            {check.state === "gone" && (
              <p className="rounded-lg border border-zombie/40 bg-zombie/10 px-4 py-3 text-zombie">
                Laid to rest. The key is gone from history.{demo && " (Demo: simulated rescan.)"}
              </p>
            )}
            {check.state === "still" && (
              <p className="rounded-lg border border-lantern/50 bg-lantern/10 px-4 py-3">
                Still haunting {check.commits} commit{check.commits === 1 ? "" : "s"}.
                {missing ? ` Most likely missing: “${missing.title}”.` : " Did the force-push go through?"}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function GhostCard({ f, laid }: { f: Finding; laid: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 text-center ${f.severity === "critical" && !laid ? "border-lantern/70 bg-lantern/12" : "border-dust bg-crypt"}`}>
      <div className={`flex h-32 items-center justify-center ${laid ? "opacity-35 grayscale" : ""}`}>
        <Sprite kind="ghost" scale={1} paused={laid} />
      </div>
      <div className="mt-2">
        <SeverityBadge severity={f.severity} fixed={laid} />
      </div>
      <h2 className="mt-2 text-xl font-bold">{f.title}</h2>
      <p className="sr-only">{SEVERITY_LABEL[f.severity]} ghost</p>
      {f.secretPreview && (
        <div className="mt-3 rounded-lg bg-plum-night px-3 py-2 font-mono text-xs text-bone/80" aria-label="Masked secret">
          {f.secretPreview}
        </div>
      )}
    </div>
  );
}

function Timeline({ f }: { f: Finding }) {
  const g = f.ghost;
  if (!g) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">Where it lives</h3>
      <ol className="mt-3 space-y-4 border-l border-dust pl-4">
        <li className="relative">
          <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-lantern" aria-hidden="true" />
          <div className="text-sm font-semibold">Born on {fmtDate(g.firstSeen.date)}</div>
          <div className="font-mono text-xs text-bone/60">{g.firstSeen.commit} · {g.firstSeen.file}:{g.firstSeen.line}</div>
        </li>
        {g.copies.map((c) => (
          <li key={`${c.commit}-${c.file}`} className="relative">
            <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-dust" aria-hidden="true" />
            <div className="text-sm font-semibold">Copied</div>
            <div className="font-mono text-xs text-bone/60">{c.commit} · {c.file}</div>
          </li>
        ))}
        <li className="relative">
          <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-dust" aria-hidden="true" />
          <div className="text-sm font-semibold">Still readable</div>
          <div className="text-xs text-bone/60">in {g.commitCount} commit{g.commitCount === 1 ? "" : "s"}</div>
        </li>
      </ol>
    </div>
  );
}
