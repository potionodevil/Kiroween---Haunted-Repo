"use client";
import { useEffect, useState } from "react";

export interface Viewer {
  configured: boolean;
  login: string | null;
  owner: boolean;
}

/** Who is logged in with GitHub, and whether they can push to `repo`. */
export function useViewer(repo: string | null): Viewer | null {
  const [v, setV] = useState<Viewer | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/auth/me${repo ? `?repo=${encodeURIComponent(repo)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<Viewer>)
      .then((d) => live && setV(d))
      .catch(() => live && setV({ configured: false, login: null, owner: false }));
    return () => {
      live = false;
    };
  }, [repo]);
  return v;
}

export const loginHref = (next: string) => `/api/auth/login?next=${encodeURIComponent(next)}`;

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  location.reload();
}
