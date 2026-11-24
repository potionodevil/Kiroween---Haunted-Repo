import { NextResponse } from "next/server";
import { canPush, getSession, oauthConfigured } from "@/lib/auth";
import { parseRepo } from "@haunted/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who is logged in, and (with ?repo=) whether they may push there. Never returns the token. */
export async function GET(req: Request) {
  const s = await getSession();
  const repo = parseRepo(new URL(req.url).searchParams.get("repo") ?? "");
  const owner = s && repo ? await canPush(s, repo.owner, repo.repo) : false;
  return NextResponse.json({ configured: oauthConfigured(), login: s?.login ?? null, owner });
}
