import "server-only";
import { cookies } from "next/headers";
import { sealJson, unsealJson } from "./seal";

/**
 * GitHub App user login (OAuth). Proves who the visitor is and which repos they may push to.
 * The user token lives only inside an encrypted httpOnly cookie; the browser cannot read it.
 */
export const SESSION_COOKIE = "hr_session";
export const STATE_COOKIE = "hr_oauth_state";
export const APP_SLUG = "haunted-repo";
export const INSTALL_URL = `https://github.com/apps/${APP_SLUG}/installations/new`;

export interface Session {
  token: string;
  login: string;
  /** Epoch ms when the user token expires. */
  exp: number;
}

export function oauthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const s = unsealJson<Session>(jar.get(SESSION_COOKIE)?.value);
  if (!s || typeof s.token !== "string" || typeof s.login !== "string" || s.exp < Date.now()) return null;
  return s;
}

export function sessionCookieValue(s: Session): string {
  return sealJson(s);
}

/** Only relative paths on this site; blocks open redirects like //evil.com. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export async function userApi<T>(token: string, path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "haunted-repo",
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** True when the logged-in user can push to owner/repo (security.md rule 8: ownership proof). */
export async function canPush(s: Session, owner: string, repo: string): Promise<boolean> {
  const r = await userApi<{ permissions?: { push?: boolean; admin?: boolean } }>(s.token, `/repos/${owner}/${repo}`);
  return r.ok && Boolean(r.data.permissions?.push || r.data.permissions?.admin);
}

/** True when the Haunted Repo app is installed on owner/repo and this user can see that installation. */
export async function appInstalled(s: Session, owner: string, repo: string): Promise<boolean> {
  const list = await userApi<{ installations?: { id: number; app_slug?: string }[] }>(s.token, "/user/installations?per_page=100");
  const mine = (list.data.installations ?? []).filter((i) => !i.app_slug || i.app_slug === APP_SLUG);
  const want = `${owner}/${repo}`.toLowerCase();
  for (const inst of mine) {
    for (let page = 1; page <= 5; page++) {
      const r = await userApi<{ repositories?: { full_name: string }[] }>(s.token, `/user/installations/${inst.id}/repositories?per_page=100&page=${page}`);
      const repos = r.data.repositories ?? [];
      if (repos.some((x) => x.full_name.toLowerCase() === want)) return true;
      if (repos.length < 100) break;
    }
  }
  return false;
}
