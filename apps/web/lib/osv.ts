import "server-only";
import { parse as parseYaml } from "yaml";
import {
  OSV_CHUNK,
  buildOsvQueries,
  mapVampires,
  parsePackageLock,
  parsePnpmLock,
  parseRequirements,
  parseYarnLock,
  type Finding,
  type LockedPackage,
  type OsvBatchResult,
  type OsvVuln,
} from "@haunted/core";
import type { SourceFile } from "@haunted/github";

const OSV = "https://api.osv.dev/v1";
/** OSV gets its own budget inside the scan deadline. */
export const OSV_BUDGET_MS = 12_000;

export function parseLockfiles(files: SourceFile[]): { packages: LockedPackage[]; skipped: number } {
  const packages: LockedPackage[] = [];
  let skipped = 0;
  for (const f of files) {
    const name = f.path.split("/").pop() ?? "";
    let r: { packages: LockedPackage[]; skipped: number } = { packages: [], skipped: 0 };
    if (name === "package-lock.json") r = parsePackageLock(f.content, f.path);
    else if (name === "yarn.lock") r = parseYarnLock(f.content, f.path);
    else if (name === "requirements.txt") r = parseRequirements(f.content, f.path);
    else if (name === "pnpm-lock.yaml") {
      try {
        r = parsePnpmLock(parseYaml(f.content, { maxAliasCount: 100 }), f.path);
      } catch {
        r = { packages: [], skipped: 1 };
      }
    }
    packages.push(...r.packages);
    skipped += r.skipped;
  }
  return { packages, skipped };
}

async function post<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, signal });
  if (!res.ok) throw new Error(`OSV ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Looks up every locked package at OSV.dev and maps hits to vampires.
 * `packageJson` maps a lockfile path to the text of the package.json next to it (for upgrade patches).
 */
export async function findVampires(
  packages: LockedPackage[],
  packageJson: Map<string, string>,
  outer: AbortSignal,
): Promise<{ findings: Finding[]; note?: string }> {
  if (packages.length === 0) return { findings: [] };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OSV_BUDGET_MS);
  const stop = () => ctrl.abort();
  outer.addEventListener("abort", stop);
  try {
    const results: OsvBatchResult["results"] = [];
    for (let i = 0; i < packages.length; i += OSV_CHUNK) {
      const chunk = packages.slice(i, i + OSV_CHUNK);
      const r = await post<OsvBatchResult>(`${OSV}/querybatch`, { queries: buildOsvQueries(chunk) }, ctrl.signal);
      results.push(...(r.results ?? []));
    }
    const ids = [...new Set(results.flatMap((r) => r.vulns?.map((v) => v.id) ?? []))];
    const details = new Map<string, OsvVuln>();
    let next = 0;
    const worker = async () => {
      while (next < ids.length && !ctrl.signal.aborted) {
        const id = ids[next++]!;
        try {
          const res = await fetch(`${OSV}/vulns/${encodeURIComponent(id)}`, { signal: ctrl.signal });
          if (res.ok) details.set(id, (await res.json()) as OsvVuln);
        } catch {
          /* skipped advisory; counted below */
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, ids.length) }, worker));
    const findings = mapVampires(packages, { results }, details, packageJson);
    const missing = ids.length - details.size;
    return {
      findings,
      note: missing > 0 ? `OSV did not return ${missing} of ${ids.length} advisories in time: some vampires may be missing.` : undefined,
    };
  } catch {
    return { findings: [], note: "OSV.dev did not answer in time: vulnerable dependencies were skipped." };
  } finally {
    clearTimeout(timer);
    outer.removeEventListener("abort", stop);
  }
}
