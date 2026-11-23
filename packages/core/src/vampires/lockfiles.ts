/** Parsers for resolved dependency versions. Pure: text or parsed objects in, packages out. */
export type Ecosystem = "npm" | "PyPI";

export interface LockedPackage {
  name: string;
  version: string;
  ecosystem: Ecosystem;
  /** Lockfile path, e.g. "package-lock.json". */
  file: string;
  /** "direct@1.0.0" → … → "this@1.2.3". At least the package itself. */
  path: string[];
  /** True when the root project depends on it directly. */
  direct: boolean;
}

export interface ParseResult {
  packages: LockedPackage[];
  /** Lines or entries that could not be used (e.g. unpinned requirements). */
  skipped: number;
}

const NM = "node_modules/";

/** package-lock.json v1, v2 and v3. Never throws; bad JSON gives an empty result. */
export function parsePackageLock(text: string, file = "package-lock.json"): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { packages: [], skipped: 1 };
  }
  if (typeof json !== "object" || json === null) return { packages: [], skipped: 1 };
  const lock = json as {
    packages?: Record<string, { version?: unknown; link?: unknown }>;
    dependencies?: Record<string, V1Dep>;
  };
  const out: LockedPackage[] = [];

  if (lock.packages && typeof lock.packages === "object") {
    const versionAt = (key: string) => {
      const v = lock.packages?.[key]?.version;
      return typeof v === "string" ? v : "?";
    };
    for (const [key, entry] of Object.entries(lock.packages)) {
      if (!key.includes(NM) || typeof entry?.version !== "string" || entry.link) continue;
      // "node_modules/a/node_modules/@s/b" -> ["a", "@s/b"]
      const parts = key.slice(key.indexOf(NM) + NM.length).split(`/${NM}`);
      const prefix = key.slice(0, key.indexOf(NM));
      const path = parts.map((name, i) => {
        const k = prefix + NM + parts.slice(0, i + 1).join(`/${NM}`);
        return `${name}@${versionAt(k)}`;
      });
      const name = parts[parts.length - 1]!;
      out.push({ name, version: entry.version, ecosystem: "npm", file, path, direct: parts.length === 1 && prefix === "" });
    }
    return { packages: dedupe(out), skipped: 0 };
  }

  if (lock.dependencies && typeof lock.dependencies === "object") {
    walkV1(lock.dependencies, [], file, out);
  }
  return { packages: dedupe(out), skipped: 0 };
}

interface V1Dep {
  version?: unknown;
  dependencies?: Record<string, V1Dep>;
}

function walkV1(deps: Record<string, V1Dep>, parent: string[], file: string, out: LockedPackage[], depth = 0) {
  if (depth > 50) return;
  for (const [name, d] of Object.entries(deps)) {
    if (typeof d?.version !== "string") continue;
    const path = [...parent, `${name}@${d.version}`];
    out.push({ name, version: d.version, ecosystem: "npm", file, path, direct: parent.length === 0 });
    if (d.dependencies && typeof d.dependencies === "object") walkV1(d.dependencies, path, file, out, depth + 1);
  }
}

/** Splits "name@1.2.3", "@scope/name@1.2.3(peer)" and pnpm v5 "name/1.2.3". */
export function splitNameVersion(spec: string): { name: string; version: string } | null {
  let s = spec.replace(/^\//, "");
  s = s.replace(/\(.*$/, "").replace(/_.*$/, "");
  const at = s.lastIndexOf("@");
  if (at > 0) {
    const name = s.slice(0, at);
    const version = s.slice(at + 1);
    if (name && /^\d/.test(version)) return { name, version };
  }
  const slash = s.lastIndexOf("/");
  if (slash > 0) {
    const name = s.slice(0, slash);
    const version = s.slice(slash + 1);
    if (name && /^\d/.test(version)) return { name, version };
  }
  return null;
}

/**
 * pnpm-lock.yaml, already parsed into a plain object by the caller (core has no YAML parser).
 * Handles lockfile v5, v6 and v9 key styles.
 */
export function parsePnpmLock(lock: unknown, file = "pnpm-lock.yaml"): ParseResult {
  if (typeof lock !== "object" || lock === null) return { packages: [], skipped: 1 };
  const l = lock as {
    packages?: Record<string, unknown>;
    importers?: Record<string, { dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> }>;
    dependencies?: Record<string, unknown>;
  };
  const direct = new Set<string>();
  const addDirect = (deps?: Record<string, unknown>) => {
    for (const n of Object.keys(deps ?? {})) direct.add(n);
  };
  for (const imp of Object.values(l.importers ?? {})) {
    addDirect(imp?.dependencies);
    addDirect(imp?.devDependencies);
  }
  addDirect(l.dependencies);

  const out: LockedPackage[] = [];
  let skipped = 0;
  for (const key of Object.keys(l.packages ?? {})) {
    const nv = splitNameVersion(key);
    if (!nv) {
      skipped++;
      continue;
    }
    out.push({ ...nv, ecosystem: "npm", file, path: [`${nv.name}@${nv.version}`], direct: direct.has(nv.name) });
  }
  return { packages: dedupe(out), skipped };
}

/** yarn.lock v1 (classic). Berry files are skipped. */
export function parseYarnLock(text: string, file = "yarn.lock"): ParseResult {
  if (/^__metadata:/m.test(text)) return { packages: [], skipped: 1 };
  const out: LockedPackage[] = [];
  let current: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    if (!line.startsWith(" ")) {
      // `"@scope/a@^1.0.0", "@scope/a@^1.1.0":` or `a@^1:`
      const first = line.replace(/:$/, "").split(",")[0]!.trim().replace(/^"|"$/g, "");
      const at = first.lastIndexOf("@");
      current = at > 0 ? first.slice(0, at) : null;
      continue;
    }
    const m = /^\s+version:?\s+"?([^"\s]+)"?/.exec(line);
    if (m && current) {
      out.push({ name: current, version: m[1]!, ecosystem: "npm", file, path: [`${current}@${m[1]}`], direct: false });
      current = null;
    }
  }
  return { packages: dedupe(out), skipped: 0 };
}

/** requirements.txt: only exact pins `name==version`; everything else is counted as skipped. */
export function parseRequirements(text: string, file = "requirements.txt"): ParseResult {
  const out: LockedPackage[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").split(";")[0]!.trim();
    if (!line || line.startsWith("-")) continue;
    const m = /^([A-Za-z0-9._-]+)(?:\[[^\]]*\])?\s*==\s*([A-Za-z0-9._+!-]+)$/.exec(line);
    if (!m) {
      skipped++;
      continue;
    }
    const name = m[1]!.toLowerCase();
    out.push({ name, version: m[2]!, ecosystem: "PyPI", file, path: [`${name}@${m[2]}`], direct: true });
  }
  return { packages: dedupe(out), skipped };
}

function dedupe(pkgs: LockedPackage[]): LockedPackage[] {
  const seen = new Map<string, LockedPackage>();
  for (const p of pkgs) {
    const k = `${p.ecosystem}:${p.name}@${p.version}`;
    const prev = seen.get(k);
    // keep the shortest path (closest to a direct dependency)
    if (!prev || p.path.length < prev.path.length) seen.set(k, p);
  }
  return [...seen.values()];
}
