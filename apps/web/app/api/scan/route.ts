import { NextResponse } from "next/server";
import { parseRepo } from "@haunted/core";
import { GitHubError } from "@haunted/github";
import { scanRepo } from "@/lib/scan";
import { DEMO_RESULT } from "@haunted/core";
import { canPush, getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("demo") === "1") return NextResponse.json(DEMO_RESULT);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const input = typeof body === "object" && body && "repo" in body ? String((body as { repo: unknown }).repo) : "";
  const ref = parseRepo(input);
  if (!ref) {
    return NextResponse.json({ error: "That does not look like a GitHub repo" }, { status: 400 });
  }

  try {
    const [result, session] = await Promise.all([scanRepo(ref), getSession()]);
    // security.md rule 8: only a proven owner (GitHub login with push access) sees masked ghost values.
    const owner = session ? await canPush(session, ref.owner, ref.repo) : false;
    const findings = owner ? result.findings : result.findings.map((f) => (f.kind === "ghost" ? { ...f, masked: undefined } : f));
    return NextResponse.json({ ...result, findings, viewer: { login: session?.login ?? null, owner } });
  } catch (e) {
    if (e instanceof GitHubError) {
      return NextResponse.json({ error: e.message, resetAt: e.resetAt }, { status: e.status });
    }
    // Never log the error object: it may carry diff text (security.md rule 3).
    console.error("scan failed", { repo: `${ref.owner}/${ref.repo}` });
    return NextResponse.json({ error: "The scan tripped over something. Try again." }, { status: 500 });
  }
}
