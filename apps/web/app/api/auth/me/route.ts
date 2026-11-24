import { NextResponse } from "next/server";
import { INSTALL_URL, appInstalled, canPush, getSession, oauthConfigured } from "@/lib/auth";
import { parseRepo } from "@haunted/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who is logged in, whether they may push to ?repo=, and whether the GitHub App is installed there. Never returns the token. */
export async function GET(req: Request) {
  const s = await getSession();
  const repo = parseRepo(new URL(req.url).searchParams.get("repo") ?? "");
  const owner = s && repo ? await canPush(s, repo.owner, repo.repo) : false;
  const installed = s && repo && owner ? await appInstalled(s, repo.owner, repo.repo).catch(() => false) : false;
  return NextResponse.json({ configured: oauthConfigured(), login: s?.login ?? null, owner, installed, installUrl: INSTALL_URL }, { headers: { "Cache-Control": "no-store" } });
}
