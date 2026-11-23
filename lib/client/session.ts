import type { ScanResult } from "@/lib/types";

/**
 * Per-tab storage shared by the house, the ritual and the hunt.
 * Holds masked findings only (security.md rule 2: no raw secrets anywhere).
 */
const resultKey = (repo: string) => `haunted:result:${repo}`;
const banishedKey = (repo: string) => `haunted:banished:${repo}`;
const stepsKey = (repo: string, id: string) => `haunted:steps:${repo}:${id}`;

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: progress is simply not kept */
  }
}

export const loadResult = (repo: string) => read<ScanResult>(resultKey(repo));
export const saveResult = (r: ScanResult) => write(resultKey(r.repo), r);

export const loadBanished = (repo: string) => new Set(read<string[]>(banishedKey(repo)) ?? []);
export const saveBanished = (repo: string, ids: Set<string>) => write(banishedKey(repo), [...ids]);

export const loadSteps = (repo: string, id: string) => new Set(read<string[]>(stepsKey(repo, id)) ?? []);
export const saveSteps = (repo: string, id: string, steps: Set<string>) => write(stepsKey(repo, id), [...steps]);

export const DEMO_REPO = "rene/spooky-shop";

/** Query string that reopens the same scan on another page. */
export function scanQuery(repo: string, demo: boolean): string {
  return demo ? "demo=1" : `repo=${encodeURIComponent(repo)}`;
}
