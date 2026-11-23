import type { Finding, Severity } from "../types";
import { stableId } from "../id";
import type { LockedPackage } from "./lockfiles";

/** The parts of an OSV vulnerability record we read (https://ossf.github.io/osv-schema/). */
export interface OsvVuln {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  severity?: { type: string; score: string }[];
  database_specific?: { severity?: string; cwe_ids?: string[] };
  affected?: {
    package?: { name?: string; ecosystem?: string };
    ranges?: { type?: string; events?: { introduced?: string; fixed?: string }[] }[];
  }[];
  references?: { url?: string }[];
}

export interface OsvBatchResult {
  results: { vulns?: { id: string }[] }[];
}

export const OSV_CHUNK = 1000;

export function buildOsvQueries(pkgs: LockedPackage[]) {
  return pkgs.map((p) => ({ package: { name: p.name, ecosystem: p.ecosystem }, version: p.version }));
}

/** Numeric-first version compare (semver and simple PEP 440). Prerelease tags sort before releases. */
export function compareVersions(a: string, b: string): number {
  const norm = (v: string) => {
    const [main = "", pre] = v.replace(/^v/, "").split(/[-+]/, 2) as [string, string | undefined];
    return { nums: main.split(/[.]/).map((x) => Number.parseInt(x, 10) || 0), pre };
  };
  const x = norm(a);
  const y = norm(b);
  const n = Math.max(x.nums.length, y.nums.length);
  for (let i = 0; i < n; i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  if (x.pre && !y.pre) return -1;
  if (!x.pre && y.pre) return 1;
  return 0;
}

/** Smallest `fixed` version above `installed` for this package, or undefined when none is known. */
export function minimalFix(v: OsvVuln, pkg: LockedPackage): string | undefined {
  const fixes: string[] = [];
  for (const a of v.affected ?? []) {
    const name = a.package?.name?.toLowerCase();
    if (name && name !== pkg.name.toLowerCase()) continue;
    for (const r of a.ranges ?? []) {
      for (const e of r.events ?? []) {
        if (e.fixed && compareVersions(e.fixed, pkg.version) > 0) fixes.push(e.fixed);
      }
    }
  }
  return fixes.sort(compareVersions)[0];
}

const RANK: Record<Severity, number> = { critical: 3, warning: 2, low: 1 };

/** GHSA labels first, then the CVSS base score when it is given as a number. Unknown = warning. */
export function osvSeverity(v: OsvVuln): Severity {
  const label = v.database_specific?.severity?.toUpperCase();
  if (label === "CRITICAL") return "critical";
  if (label === "HIGH") return "warning";
  if (label === "MODERATE" || label === "MEDIUM" || label === "LOW") return "low";
  for (const s of v.severity ?? []) {
    const n = Number.parseFloat(s.score);
    if (Number.isFinite(n)) return n >= 9 ? "critical" : n >= 7 ? "warning" : "low";
  }
  return "warning";
}

/** Unified diff that bumps a direct dependency in package.json. Returns undefined when the line is not found. */
export function packageJsonPatch(pkgJson: string, file: string, name: string, version: string): string | undefined {
  const lines = pkgJson.split(/\r?\n/);
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^(\\s*"${esc}"\\s*:\\s*")([~^]?)([^"]+)(".*)$`);
  const i = lines.findIndex((l) => re.test(l));
  if (i < 0) return undefined;
  const m = re.exec(lines[i]!)!;
  const next = `${m[1]}${m[2]}${version}${m[4]}`;
  return `--- a/${file}\n+++ b/${file}\n@@ -${i + 1},1 +${i + 1},1 @@\n-${lines[i]}\n+${next}\n`;
}

/**
 * One vampire per vulnerable package version, merging all its advisories.
 * `batch.results[i]` belongs to `pkgs[i]`. `packageJson` maps a lockfile path to its sibling package.json text.
 */
export function mapVampires(
  pkgs: LockedPackage[],
  batch: OsvBatchResult,
  details: Map<string, OsvVuln>,
  packageJson: Map<string, string> = new Map(),
): Finding[] {
  const out: Finding[] = [];
  pkgs.forEach((pkg, i) => {
    const ids = batch.results[i]?.vulns?.map((v) => v.id) ?? [];
    const vulns = ids.map((id) => details.get(id)).filter((v): v is OsvVuln => Boolean(v));
    if (vulns.length === 0) return;

    let worst = vulns[0]!;
    for (const v of vulns) if (RANK[osvSeverity(v)] > RANK[osvSeverity(worst)]) worst = v;
    const severity = osvSeverity(worst);
    // an upgrade must fix every advisory: take the highest of the per-advisory minimal fixes
    const perVuln = vulns.map((v) => minimalFix(v, pkg));
    const allFixable = perVuln.every(Boolean);
    const minimalUpgrade = allFixable ? (perVuln as string[]).sort(compareVersions).at(-1) : undefined;

    const cwe = vulns.flatMap((v) => v.database_specific?.cwe_ids ?? [])[0];
    const references = [...new Set(vulns.flatMap((v) => [`https://osv.dev/vulnerability/${v.id}`, ...(v.references ?? []).map((r) => r.url ?? "")]))]
      .filter(Boolean)
      .slice(0, 6);
    const summary = worst.summary?.trim() || `Known vulnerability ${worst.id}`;
    const pkgJsonFile = pkg.file.replace(/(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/, "package.json");
    const pkgJson = packageJson.get(pkg.file);
    const patch =
      minimalUpgrade && pkg.direct && pkgJson ? packageJsonPatch(pkgJson, pkgJsonFile, pkg.name, minimalUpgrade) : undefined;

    out.push({
      id: stableId("vampire", ["osv", pkg.ecosystem, pkg.name, pkg.version]),
      kind: "vampire",
      severity,
      rule: `osv/${worst.id}`,
      cwe,
      owasp: "A06:2021",
      title: `Vulnerable ${pkg.name} ${pkg.version}`,
      file: pkg.file,
      message:
        `${summary.replace(/\.?$/, ".")} ${pkg.name} ${pkg.version} has ${vulns.length} known ${vulns.length === 1 ? "advisory" : "advisories"}` +
        ` (${vulns.map((v) => v.id).slice(0, 3).join(", ")}${vulns.length > 3 ? ", …" : ""}).` +
        (pkg.direct ? "" : ` It comes in through ${pkg.path[0]}.`),
      fix: minimalUpgrade
        ? `Upgrade ${pkg.name} to ${minimalUpgrade}${pkg.direct ? "" : ` (or upgrade ${pkg.path[0]?.replace(/@[^@]*$/, "")} so it pulls a fixed version)`}.`
        : `No fixed version is published yet. Replace ${pkg.name} or limit how you use it.`,
      autoFixable: Boolean(patch),
      patch,
      references,
      dependencyPath: pkg.path,
      minimalUpgrade,
    });
  });
  return out;
}
