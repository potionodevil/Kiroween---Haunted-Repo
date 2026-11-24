import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, STATE_COOKIE, oauthConfigured, safeNext, sessionCookieValue, userApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (origin: string, why: string) => NextResponse.redirect(`${origin}/?login=${encodeURIComponent(why)}`);

/** GitHub sends the user back here with ?code&state. Exchanges the code for a user token. Logs nothing. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!oauthConfigured()) return fail(url.origin, "not-configured");
  const jar = await cookies();
  const [state, nextRaw] = (jar.get(STATE_COOKIE)?.value ?? "").split("|");
  const code = url.searchParams.get("code");
  if (!code || !state || url.searchParams.get("state") !== state) return fail(url.origin, "state");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "haunted-repo" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    }),
    cache: "no-store",
  });
  const tok = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!tok.access_token) return fail(url.origin, tok.error ?? "token");

  const me = await userApi<{ login?: string }>(tok.access_token, "/user");
  if (!me.ok || !me.data.login) return fail(url.origin, "user");

  const res = NextResponse.redirect(`${url.origin}${safeNext(nextRaw)}`);
  const exp = Date.now() + Math.min(tok.expires_in ?? 28_800, 28_800) * 1000;
  res.cookies.set(SESSION_COOKIE, sessionCookieValue({ token: tok.access_token, login: me.data.login, exp }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor((exp - Date.now()) / 1000),
  });
  res.cookies.delete(STATE_COOKIE);
  return res;
}
