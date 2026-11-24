import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { STATE_COOKIE, oauthConfigured, safeNext } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Starts the GitHub App login. `next` = where to return afterwards (relative path only). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!oauthConfigured()) {
    return NextResponse.json({ error: "GitHub login is not set up on this server (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)." }, { status: 503 });
  }
  const state = randomBytes(16).toString("base64url");
  const next = safeNext(url.searchParams.get("next"));
  const auth = new URL("https://github.com/login/oauth/authorize");
  auth.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  auth.searchParams.set("redirect_uri", `${url.origin}/api/auth/callback`);
  auth.searchParams.set("state", state);
  const res = NextResponse.redirect(auth.toString());
  res.cookies.set(STATE_COOKIE, `${state}|${next}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
