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
    const d = (await res.json()) as { url?: string; number?: number; error?: string; installUrl?: string; skipped?: string[] };
    if (res.status === 401) {
      location.href = loginHref(next);
      return { tone: "run", text: "Logging in with GitHub…", status: 401 };
    }
    if (d.url) return { tone: "ok", text: `Pull request #${d.number} opened${d.skipped?.length ? ` · ${d.skipped.length} skipped` : ""}`, url: d.url, status: res.status };
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
