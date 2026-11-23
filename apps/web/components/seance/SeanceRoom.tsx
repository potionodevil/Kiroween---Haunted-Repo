"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SEANCE_FINDING, SEANCE_RUN, type SeanceLine, type SeanceTone } from "@haunted/core";
import { Sprite } from "@/components/Sprite";
import { CopyButton } from "@/components/house/CopyButton";
import { SeanceScene } from "./SeanceScene";

type RunState = "idle" | "running" | "done";
type Proof = "not-run" | "failed" | "fixing" | "passed";

const TONE: Record<SeanceTone, string> = {
  cmd: "text-bone",
  info: "text-lantern",
  ok: "text-zombie",
  fail: "text-[#ff8a8a]",
  dim: "text-bone/55",
};

const PROOF_LABEL: Record<Proof, string> = { "not-run": "Not run yet", failed: "Reproduced", fixing: "Fix applied", passed: "Fix proven" };

/**
 * Séance room (feature 26 + 32). Today it plays the prepared demo run; the live Vercel Sandbox runner
 * replaces SEANCE_RUN in M3. Nothing here talks to the network.
 */
export function SeanceRoom({ repoLabel, isDemo }: { repoLabel: string; isDemo: boolean }) {
  const [state, setState] = useState<RunState>("idle");
  const [lines, setLines] = useState<SeanceLine[]>([]);
  const [before, setBefore] = useState<"Not run" | "Failed">("Not run");
  const [after, setAfter] = useState<"Not run" | "Running" | "Passed">("Not run");
  const [proof, setProof] = useState<Proof>("not-run");
  const timers = useRef<number[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  const begin = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setLines([]);
    setBefore("Not run");
    setAfter("Not run");
    setProof("not-run");
    setState("running");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let at = 0;
    SEANCE_RUN.forEach((line, i) => {
      at += reduced ? 0 : line.delay;
      timers.current.push(
        window.setTimeout(() => {
          setLines((l) => [...l, line]);
          if (line.phase === "before-failed") {
            setBefore("Failed");
            setProof("failed");
          }
          if (line.phase === "fix-applied") {
            setProof("fixing");
            setAfter("Running");
          }
          if (line.phase === "after-passed") {
            setAfter("Passed");
            setProof("passed");
          }
          if (i === SEANCE_RUN.length - 1) setState("done");
        }, at),
      );
    });
  };

  return (
    <div>
      <header className="border-b border-dust/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div className="flex items-baseline gap-3">
            <Link href="/" className="font-display text-3xl">Haunted Repo</Link>
            <span className="text-bone/70">Séance room</span>
          </div>
          <span className="rounded-lg border border-dust px-3 py-2 font-mono text-sm text-bone/80">{repoLabel}</span>
        </div>
      </header>

      <section className="border-b border-dust/60 bg-crypt/60">
        <div className="mx-auto grid max-w-6xl items-end gap-8 px-4 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="pb-14">
            <h1 className="font-display text-6xl leading-none sm:text-8xl">Let the code speak</h1>
            <p className="mt-6 max-w-lg text-lg text-bone/80">
              We run your build and tests in a sealed sandbox, prove each problem with a failing test, fix it, and only then
              open a pull request.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={begin}
                disabled={state === "running"}
                className="rounded-xl bg-lantern px-6 py-3.5 text-lg font-semibold text-plum-night hover:brightness-105 disabled:opacity-60"
              >
                {state === "idle" ? "Begin the séance" : state === "running" ? "The spirits are talking…" : "Hold it again"}
              </button>
              <p className="max-w-xs text-sm text-bone/65">
                No secrets, no tokens, no network after install. The sandbox is destroyed after the run.
              </p>
            </div>
            {!isDemo && (
              <p className="mt-4 max-w-lg rounded-lg border border-dust px-3 py-2 text-sm text-bone/75">
                The live sandbox for your own repo comes next. This room plays the prepared run of the demo repo.
              </p>
            )}
          </div>
          <SeanceScene className="w-full max-w-xl justify-self-end" />
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.7fr_1fr]">
        <section aria-label="Sandbox output" className="overflow-hidden rounded-2xl border border-dust bg-[#100a19]">
          <div className="flex items-center gap-3 border-b border-dust/70 bg-crypt px-4 py-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="size-3 rounded-full bg-dust" />
              <span className="size-3 rounded-full bg-dust" />
              <span className="size-3 rounded-full bg-dust" />
            </span>
            <span className="text-sm text-bone/80">Sandbox: Firecracker microVM, 2 vCPU</span>
            <span
              className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${state === "running" ? "bg-lantern text-plum-night" : state === "done" ? "bg-zombie/20 text-zombie" : "bg-dust text-bone/80"}`}
            >
              {state === "idle" ? "Idle" : state === "running" ? "Running" : "Done"}
            </span>
          </div>
          <div ref={logRef} role="log" aria-live="polite" className="h-[440px] overflow-y-auto p-5 font-mono text-sm leading-relaxed">
            {lines.length === 0 ? (
              <p className="text-bone/55">Waiting for the séance to begin. Press &quot;Begin the séance&quot;.</p>
            ) : (
              lines.map((l, i) => (
                <div key={i} className={`whitespace-pre-wrap ${TONE[l.tone]}`}>
                  {l.text}
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-dust bg-crypt p-5">
          <div className="flex items-center gap-3">
            <Sprite kind="spider" scale={0.45} paused={proof === "passed"} />
            <h2 className="text-2xl font-bold">Proof of haunting</h2>
          </div>
          <span
            className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${proof === "passed" ? "bg-zombie/20 text-zombie" : proof === "failed" ? "bg-lantern text-plum-night" : "bg-dust text-bone/85"}`}
          >
            {PROOF_LABEL[proof]}
          </span>
          <p className="mt-3 text-bone/85">Spider: {SEANCE_FINDING.title} in</p>
          <p className="font-mono text-sm text-bone/70">
            {SEANCE_FINDING.file}:{SEANCE_FINDING.line}
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-plum-night p-3">
            <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-bone/85">{SEANCE_FINDING.proofTest}</pre>
            <CopyButton text={SEANCE_FINDING.proofTest} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-dust p-3">
              <div className="text-xs text-bone/65">Before fix</div>
              <div className={`text-lg font-bold ${before === "Failed" ? "text-[#ff8a8a]" : ""}`}>{before}</div>
            </div>
            <div className="rounded-xl border border-dust p-3">
              <div className="text-xs text-bone/65">After fix</div>
              <div className={`text-lg font-bold ${after === "Passed" ? "text-zombie" : ""}`}>{after}</div>
            </div>
          </div>
          {state === "done" && (
            <button type="button" disabled title="Needs the Haunted Repo GitHub App (M3b)" className="mt-4 w-full rounded-lg border border-dust px-4 py-2.5 text-bone/50">
              Open the exorcism PR
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
