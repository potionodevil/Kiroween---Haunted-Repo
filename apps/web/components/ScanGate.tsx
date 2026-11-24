"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { ScanResult } from "@haunted/core";
import { DEMO_REPO, loadResult, saveResult } from "@/lib/client/session";
import { Sprite } from "@/components/Sprite";
import { HauntedLoader } from "@/components/HauntedLoader";
import { HauntedHouse } from "@/components/house/HauntedHouse";
import { HuntScene } from "@/components/hunt/HuntScene";
import { Ritual } from "@/components/exorcism/Ritual";
import { Report } from "@/components/report/Report";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: ScanResult };

export interface GateContext {
  result: ScanResult;
  demo: boolean;
  /** Runs a fresh scan and returns it (also updates the page). */
  rescan: () => Promise<ScanResult | null>;
}

interface Props {
  repo: string | null;
  demo: boolean;
  /** Reuse a scan from this tab instead of scanning again. */
  useCache?: boolean;
  /** Server pages cannot pass render functions to client components, so they name the view. */
  view: "house" | "hunt" | "ritual" | "report";
  /** Finding id for the ritual view. */
  id?: string;
}

function renderView(view: Props["view"], ctx: GateContext, id?: string): ReactNode {
  if (view === "hunt") return <HuntScene ctx={ctx} />;
  if (view === "ritual") return <Ritual id={id ?? ""} ctx={ctx} />;
  if (view === "report") return <Report ctx={ctx} />;
  return <HauntedHouse result={ctx.result} demo={ctx.demo} />;
}

async function fetchScan(repo: string | null, demo: boolean): Promise<ScanResult> {
  const res = await fetch(demo ? "/api/scan?demo=1" : "/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo }),
  });
  const data = (await res.json()) as ScanResult & { error?: string; resetAt?: string };
  if (!res.ok) {
    const when = data.resetAt ? ` (at ${new Date(data.resetAt).toLocaleTimeString()})` : "";
    throw new Error((data.error ?? "Something went wrong.") + when);
  }
  return data;
}

/** Loads a scan result (cache first if allowed), shows loading and error states, then renders children. */
export function ScanGate({ repo, demo, useCache = false, view, id }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });
  const key = demo ? DEMO_REPO : repo;

  const run = useCallback(async (): Promise<ScanResult | null> => {
    setState({ status: "loading" });
    try {
      const result = await fetchScan(repo, demo);
      saveResult(result);
      setState({ status: "done", result });
      return result;
    } catch (e) {
      const message = e instanceof Error && e.message !== "Failed to fetch"
        ? e.message
        : "We could not reach the scanner. Check your connection.";
      setState({ status: "error", message });
      return null;
    }
  }, [repo, demo]);

  useEffect(() => {
    if (!key) {
      setState({ status: "error", message: "No repo given." });
      return;
    }
    const cached = useCache ? loadResult(key) : null;
    if (cached) setState({ status: "done", result: cached });
    else void run();
  }, [key, useCache, run]);

  if (state.status === "done") return <>{renderView(view, { result: state.result, demo, rescan: run }, id)}</>;

  if (state.status === "loading") {
    return <HauntedLoader label={`Walking through up to 300 commits of ${demo ? "the demo repo" : repo}…`} sub="Big repos take up to a minute." />;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Sprite kind="ghost" scale={0.8} paused />
      <p role="alert" className="max-w-md text-lg">{state.message}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => void run()} className="rounded-lg bg-lantern px-4 py-2 font-semibold text-plum-night">
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-dust px-4 py-2">Back</Link>
      </div>
    </main>
  );
}
