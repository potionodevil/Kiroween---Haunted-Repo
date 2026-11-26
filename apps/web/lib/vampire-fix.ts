import "server-only";
import { Sandbox } from "@vercel/sandbox";

/**
 * Vampire auto-fix: raise vulnerable packages to their smallest safe version and rewrite the lockfile
 * inside a Vercel Sandbox, so package.json and the lockfile stay in sync.
 * Direct dependencies get a new range; transitive ones get an override (npm "overrides", pnpm "pnpm.overrides").
 * security.md rules 10 and 11: no secrets go in, installs run with --ignore-scripts and only touch the lockfile.
 */
export interface Upgrade {
  name: string;
  version: string;
}

export interface VampireResult {
  dir: string;
  manager: "npm" | "pnpm";
  files: { path: string; content: string }[];
  log: string[];
}

const ROOT = "/vercel/sandbox";
const NAME = /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i;
const VERSION = /^\d+\.\d+\.\d+([-.+][0-9A-Za-z.-]+)?$/;

export function validUpgrades(list: unknown): Upgrade[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((u): u is Upgrade => typeof u?.name === "string" && typeof u?.version === "string" && NAME.test(u.name) && VERSION.test(u.version))
    .slice(0, 40);
}

export async function fixVampires(owner: string, repo: string, ref: string, lockfile: string, ups: Upgrade[]): Promise<VampireResult> {
  const dir = lockfile.includes("/") ? lockfile.slice(0, lockfile.lastIndexOf("/")) : "";
  if (dir.includes("..") || /['"`$\\]/.test(dir)) throw new Error("bad folder");
  const manager: "npm" | "pnpm" = lockfile.endsWith("pnpm-lock.yaml") ? "pnpm" : "npm";
  if (!lockfile.endsWith("package-lock.json") && manager !== "pnpm") throw new Error("Only npm and pnpm lockfiles can be fixed for now.");
  const cwd = dir ? `${ROOT}/${dir}` : ROOT;
  const log: string[] = [];
  let sandbox: Sandbox | null = null;
  try {
    sandbox = await Sandbox.create({
      source: { type: "git", url: `https://github.com/${owner}/${repo}.git`, depth: 1, revision: ref },
      resources: { vcpus: 2 },
      timeout: 4 * 60_000,
      networkPolicy: { allow: ["registry.npmjs.org", "*.npmjs.org"] },
    });
    const sh = async (script: string) => {
      const c = await sandbox!.runCommand("sh", ["-c", `cd '${cwd}' && ${script}`]);
      const out = await c.stdout().catch(() => "");
      const err = await c.stderr().catch(() => "");
      return { code: c.exitCode, out, err };
    };

    const pkg = JSON.parse((await sh("cat package.json")).out) as Record<string, Record<string, string> | undefined>;
    const direct = (n: string) => (pkg.dependencies?.[n] ? "dependencies" : pkg.devDependencies?.[n] ? "devDependencies" : pkg.optionalDependencies?.[n] ? "optionalDependencies" : null);

    // Edit package.json in place: new ranges for direct deps, overrides for transitive ones.
    const edits = ups.map((u) => ({ ...u, section: direct(u.name) }));
    const overridesKey = manager === "pnpm" ? "pnpm.overrides" : "overrides";
    const script = `const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json","utf8"));const e=${JSON.stringify(edits)};
for(const u of e){if(u.section){p[u.section][u.name]="^"+u.version;}else{${manager === "pnpm" ? 'p.pnpm=p.pnpm||{};p.pnpm.overrides=p.pnpm.overrides||{};p.pnpm.overrides[u.name]="^"+u.version;' : 'p.overrides=p.overrides||{};p.overrides[u.name]="^"+u.version;'}}}
fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\\n");`;
    await sandbox.writeFiles([{ path: `${cwd}/.hr-edit.cjs`, content: Buffer.from(script) }]);
    const ed = await sh("node .hr-edit.cjs && rm .hr-edit.cjs");
    if (ed.code !== 0) throw new Error("could not edit package.json");
    for (const u of edits) log.push(u.section ? `${u.name}: ${u.section} → ^${u.version}` : `${u.name}: ${overridesKey} → ^${u.version}`);

    const install =
      manager === "pnpm"
        ? "npx --yes pnpm@9 install --lockfile-only --ignore-scripts --no-frozen-lockfile"
        : "npm install --package-lock-only --ignore-scripts --no-audit --no-fund";
    const r = await sh(install);
    if (r.code !== 0) throw new Error(`lockfile update failed: ${(r.err || r.out).split("\n").filter(Boolean).slice(-2).join(" ").slice(0, 200)}`);

    const lockName = manager === "pnpm" ? "pnpm-lock.yaml" : "package-lock.json";
    const files = [
      { path: dir ? `${dir}/package.json` : "package.json", content: (await sh("cat package.json")).out },
      { path: dir ? `${dir}/${lockName}` : lockName, content: (await sh(`cat ${lockName}`)).out },
    ];
    return { dir, manager, files, log };
  } finally {
    await sandbox?.stop().catch(() => undefined);
  }
}
