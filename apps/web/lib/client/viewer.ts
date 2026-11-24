"use client";
import { useCallback, useEffect, useState } from "react";

export interface Viewer {
  configured: boolean;
  login: string | null;
  owner: boolean;
  /** The Haunted Repo GitHub App is installed on this repo. */
  installed: boolean;
  installUrl: string;
}

const NONE: Viewer = { configured: false, login: null, owner: false, installed: false, installUrl: "https://github.com/apps/haunted-repo/installations/new" };

/**
 * Who is logged in with GitHub, whether they can push to `repo`, and whether the app is installed there.
 * Checks again whenever the tab comes back into focus (e.g. after installing the app on github.com).
 */
export function useViewer(repo: string | null): (Viewer & { refresh: () => void }) | null {
  const [v, setV] = useState<Viewer | null>(null);
  const load = useCallback(() => {
    fetch(`/api/auth/me${repo ? `?repo=${encodeURIComponent(repo)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<Viewer>)
      .then((d) => setV({ ...NONE, ...d }))
      .catch(() => setV(NONE));
  }, [repo]);
  useEffect(() => {
    load();
    const onFocus = () => document.visibilityState === "visible" && load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);
  return v ? { ...v, refresh: load } : null;
}

export const loginHref = (next: string) => `/api/auth/login?next=${encodeURIComponent(next)}`;

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  location.reload();
}
