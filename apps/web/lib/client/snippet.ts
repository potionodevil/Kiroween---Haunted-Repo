"use client";
import { useEffect, useState } from "react";
import { redactLine, type Finding } from "@haunted/core";

export interface Snippet {
  start: number;
  /** The flagged line, or null when the finding is about the whole file. */
  line: number | null;
  lines: string[];
}

const cache = new Map<string, Snippet | null>();

/** Code around a finding for the demo repo, built from the patch (the demo repo does not exist on GitHub). */
function fromPatch(f: Finding): Snippet | null {
  if (!f.patch) return null;
  const m = /@@ -(\d+)/.exec(f.patch);
  const start = m ? Math.max(1, Number(m[1])) : 1;
  const lines = f.patch
    .split("\n")
    .filter((l) => (l.startsWith(" ") || l.startsWith("-")) && !l.startsWith("---"))
    .map((l) => redactLine(l.slice(1)));
  return lines.length ? { start, line: f.line ?? null, lines } : null;
}

/** Loads the code around a finding once `active` turns true. Cached per finding. */
export function useSnippet(f: Finding, repo: string, ref: string, demo: boolean, active: boolean): Snippet | null | undefined {
  const key = `${repo}:${f.id}`;
  const [s, setS] = useState<Snippet | null | undefined>(cache.get(key));
  useEffect(() => {
    if (!active || cache.has(key)) {
      if (cache.has(key)) setS(cache.get(key));
      return;
    }
    if (demo || !f.file || f.file.endsWith("/") || f.kind === "vampire" || f.kind === "banshee") {
      const v = demo ? fromPatch(f) : null;
      cache.set(key, v);
      setS(v);
      return;
    }
    let live = true;
    const q = new URLSearchParams({ repo, file: f.file, ref: f.commit ?? ref, line: String(f.line ?? 0) });
    fetch(`/api/snippet?${q}`)
      .then((r) => (r.ok ? (r.json() as Promise<Snippet>) : null))
      .catch(() => null)
      .then((v) => {
        cache.set(key, v);
        if (live) setS(v);
      });
    return () => {
      live = false;
    };
  }, [active, key, f, repo, ref, demo]);
  return s;
}
