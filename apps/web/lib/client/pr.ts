"use client";
import type { Finding } from "@haunted/core";
import { loginHref } from "./viewer";

export interface PrResult {
  tone: "run" | "ok" | "bad";
  text: string;
  url?: string;
}

async function post(path: string, body: unknown, next: string): Promise<PrResult & { status: number }> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = (await res.json()) as { url?: string; number?: number; error?: string; installUrl?: string; skipped?: string[]; verifying?: boolean };
    if (res.status === 401) {
      location.href = loginHref(next);
      return { tone: "run", text: "Logging in with GitHub…", status: 401 };
    }
    if (d.url) return { tone: "ok", text: `Pull request #${d.number} opened${d.skipped?.length ? ` · ${d.skipped.length} skipped` : ""}${d.verifying ? " · tests running, result comes as a PR comment" : ""}`, url: d.url, status: res.status };
    if (d.installUrl) return { tone: "bad", text: "Install the GitHub App first", url: d.installUrl, status: res.status };
    return { tone: "bad", text: d.error ?? `Failed (${res.status})`, status: res.status };
  } catch {
    return { tone: "bad", text: "Could not reach the server", status: 0 };
  }
}

/** One pull request with these auto-fixes; each changed spot gets a haunted-repo comment. */
export const requestFixPr = (repo: string, list: Finding[], next: string) =>
  post("/api/fix-pr", { repo, mark: true, fixes: list.map((f) => ({ rule: f.rule, title: f.title, patch: f.patch })) }, next);

/** A pull request that adds the Haunting score badge to the README. */
export const requestBadgePr = (repo: string, next: string) => post("/api/readme-badge", { repo }, next);

/** Name and safe version for a vampire, or null when OSV knows no fixed version. */
export function vampireUpgrade(f: Finding): { name: string; version: string } | null {
  // Only npm and pnpm lockfiles can be rewritten in the sandbox for now.
  if (f.kind !== "vampire" || !f.minimalUpgrade || !/(package-lock.json|pnpm-lock.yaml)$/.test(f.file)) return null;
  const name = f.title.replace(/^Vulnerable /, "").replace(/ [^ ]+$/, "");
  return name ? { name, version: f.minimalUpgrade } : null;
}

/**
 * Opens the right pull requests for a mixed list: vampires go to the sandbox lockfile fix (one PR per
 * lockfile), everything else to the patch PR. Returns the first PR or the first error.
 */
export async function requestFixes(repo: string, list: Finding[], next: string): Promise<PrResult> {
  const byLock = new Map<string, { name: string; version: string }[]>();
  const rest: Finding[] = [];
  for (const f of list) {
    const up = vampireUpgrade(f);
    if (up && /(package-lock\.json|pnpm-lock\.yaml)$/.test(f.file)) byLock.set(f.file, [...(byLock.get(f.file) ?? []), up]);
    else if (f.patch && f.kind !== "vampire") rest.push(f);
  }
  const results: PrResult[] = [];
  if (rest.length) results.push(await requestFixPr(repo, rest, next));
  for (const [lockfile, upgrades] of byLock) results.push(await post("/api/vampire-pr", { repo, lockfile, upgrades }, next));
  const ok = results.filter((r) => r.tone === "ok");
  if (ok.length === 0) return results[0] ?? { tone: "bad", text: "Nothing to fix" };
  return ok.length === 1 ? ok[0]! : { ...ok[0]!, text: `${ok.length} pull requests opened` };
}
