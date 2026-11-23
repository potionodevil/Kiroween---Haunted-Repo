import type { Finding, ScanResult } from "../types";
import { HEAD, collectGhosts, scanText } from "../secrets/scan";
import { parsePackageLock, parseRequirements, parseYarnLock, type LockedPackage } from "../vampires/lockfiles";
import { snapshot } from "../repo/snapshot";
import { findPoltergeists } from "../repo/poltergeists";
import { findPossessedConfigs } from "../repo/possessed";
import { findMummies } from "../repo/mummies";
import { detectStack, findSkeletons } from "../repo/skeletons";
import { score, sortFindings } from "../score";
import { lintCode } from "./lint";

export interface LocalFile {
  path: string;
  content: string;
}

const CODE = /\.(m?[jt]sx?|cjs|mts|cts)$/i;

/**
 * Scans files already in memory (working tree, a single file, an MCP request) with every offline scanner:
 * ghosts at HEAD, the ESLint pipeline, repo creatures and stack. Vampires need OSV, so the packages are returned
 * for the caller to look up when it may use the network.
 */
export function scanLocalFiles(
  files: LocalFile[],
  opts: { paths?: string[]; repo?: string } = {},
): { result: ScanResult; packages: LockedPackage[] } {
  const started = Date.now();
  const paths = opts.paths ?? files.map((f) => f.path);
  const code = files.filter((f) => CODE.test(f.path));
  const hits = files.flatMap((f) => scanText(f.content, { file: f.path, commit: HEAD, date: null }));
  const lint = lintCode(code);
  const snap = snapshot(paths, files);
  const sqlFiles = [...new Set(lint.findings.filter((f) => f.rule === "spider/sql-concat").map((f) => f.file))];
  const repo = opts.repo ?? "local/repo";

  const packages: LockedPackage[] = [];
  for (const f of files) {
    const name = f.path.split("/").pop();
    if (name === "package-lock.json") packages.push(...parsePackageLock(f.content, f.path).packages);
    else if (name === "yarn.lock") packages.push(...parseYarnLock(f.content, f.path).packages);
    else if (name === "requirements.txt") packages.push(...parseRequirements(f.content, f.path).packages);
  }

  const findings: Finding[] = sortFindings([
    ...collectGhosts([], hits),
    ...lint.findings,
    ...findPoltergeists(snap),
    ...findPossessedConfigs(snap),
    ...findMummies(snap, repo, code.map((f) => f.content).join("\n")),
    ...findSkeletons(snap, code, sqlFiles),
  ]);
  const notes: string[] = [];
  if (lint.skipped) notes.push(`${lint.skipped} code files could not be parsed.`);
  return {
    packages,
    result: {
      repo,
      defaultBranch: "working tree",
      commitsScanned: 0,
      filesScanned: files.length,
      durationMs: Date.now() - started,
      partial: false,
      notes,
      findings,
      score: score(findings),
      stack: detectStack(snap),
      packages: packages.map((p) => ({ name: p.name, version: p.version, ecosystem: p.ecosystem })),
    },
  };
}
