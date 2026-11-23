"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ScanResult } from "@/lib/types";
import { Sprite } from "@/components/Sprite";
import { HauntedHouse } from "./HauntedHouse";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: ScanResult };

export function HouseLoader({ repo, demo }: { repo: string | null; demo: boolean }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const run = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(demo ? "/api/scan?demo=1" : "/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      const data = (await res.json()) as ScanResult & { error?: string; resetAt?: string };
      if (!res.ok) {
        const when = data.resetAt ? ` (at ${new Date(data.resetAt).toLocaleTimeString()})` : "";
        setState({ status: "error", message: (data.error ?? "Something went wrong.") + when });
        return;
      }
      setState({ status: "done", result: data });
    } catch {
      setState({ status: "error", message: "We could not reach the scanner. Check your connection." });
    }
  }, [repo, demo]);

  useEffect(() => {
    if (!repo && !demo) {
      setState({ status: "error", message: "No repo given." });
      return;
    }
    void run();
  }, [repo, demo, run]);

  if (state.status === "done") return <HauntedHouse result={state.result} />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      {state.status === "loading" ? (
        <>
          <div className="flex items-end gap-8" aria-hidden="true">
            <Sprite kind="ghost" scale={0.8} />
            <Sprite kind="zombie" scale={0.8} />
            <Sprite kind="bat" scale={0.8} />
          </div>
          <p role="status" className="text-lg">
            Walking through up to 300 commits of <span className="font-mono">{demo ? "the demo repo" : repo}</span>…
          </p>
          <p className="text-sm text-bone/60">Big repos take up to a minute.</p>
        </>
      ) : (
        <>
          <Sprite kind="ghost" scale={0.8} paused />
          <p role="alert" className="max-w-md text-lg">{state.message}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void run()}
              className="rounded-lg bg-lantern px-4 py-2 font-semibold text-plum-night"
            >
              Try again
            </button>
            <Link href="/" className="rounded-lg border border-dust px-4 py-2">Back</Link>
          </div>
        </>
      )}
    </main>
  );
}
