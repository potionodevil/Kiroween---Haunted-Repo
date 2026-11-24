import { NextResponse } from "next/server";
import { unseal } from "@/lib/seal";
import { guard } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GH_TOKEN = /^(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,})$/;
/** One revocation per client per minute; GitHub's own limit is stricter for anonymous calls anyway. */
const recent = new Map<string, number>();

/**
 * Feature 12: banish a leaked GitHub token through GitHub's credential revocation endpoint.
 * The endpoint is meant for credentials the caller does not own and is called without authentication.
 * The body carries only a sealed handle; nothing is logged.
 */
export async function POST(req: Request) {
  const blocked = guard(req, { name: "revoke", max: 5, windowMs: 600000 });
  if (blocked) return blocked;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const last = recent.get(ip) ?? 0;
  if (Date.now() - last < 60_000) {
    return NextResponse.json({ error: "One banishment per minute. Try again shortly." }, { status: 429 });
  }

  let body: { handle?: unknown; confirm?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body */
  }
  if (body.confirm !== true || typeof body.handle !== "string") {
    return NextResponse.json({ error: "Confirmation missing." }, { status: 400 });
  }
  const token = unseal(body.handle);
  if (!token || !GH_TOKEN.test(token)) {
    return NextResponse.json({ error: "This handle expired. Scan the repo again, then retry." }, { status: 400 });
  }
  recent.set(ip, Date.now());

  try {
    const res = await fetch("https://api.github.com/credentials/revoke", {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "haunted-repo",
      },
      body: JSON.stringify({ credentials: [token] }),
    });
    if (res.status === 202 || res.ok) {
      return NextResponse.json({ ok: true, message: "GitHub accepted the revocation. The token stops working within minutes." });
    }
    if (res.status === 429 || res.status === 403) {
      return NextResponse.json({ error: "GitHub rate-limits revocations. Try again later." }, { status: 429 });
    }
    return NextResponse.json({ error: `GitHub answered ${res.status}.` }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "Could not reach GitHub." }, { status: 502 });
  }
}
