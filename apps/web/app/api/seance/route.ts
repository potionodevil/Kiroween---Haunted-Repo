import { NextResponse } from "next/server";
import { parseRepo } from "@haunted/core";
import { canPush, getSession, userApi } from "@/lib/auth";
import { runSeance } from "@/lib/seance";
import { guard } from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Streams a live séance as NDJSON. Only for a logged-in owner of the repo:
 * sandboxes cost money, and running someone else's code on their behalf needs their consent.
 */
export async function POST(req: Request) {
  const blocked = guard(req, { name: "seance", max: 3, windowMs: 600000 });
  if (blocked) return blocked;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Log in with GitHub to run a live séance." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { repo?: string } | null;
  const ref = parseRepo(body?.repo ?? "");
  if (!ref) return NextResponse.json({ error: "That does not look like a GitHub repo" }, { status: 400 });
  if (!(await canPush(s, ref.owner, ref.repo))) return NextResponse.json({ error: "Only people with push access can run a séance on this repo." }, { status: 403 });

  const info = await userApi<{ default_branch?: string; size?: number }>(s.token, `/repos/${ref.owner}/${ref.repo}`);
  if ((info.data.size ?? 0) > 200_000) return NextResponse.json({ error: "This repo is over 200 MB. The séance table is too small." }, { status: 413 });
  const branch = info.data.default_branch ?? "main";

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const ev of runSeance(ref.owner, ref.repo, branch)) controller.enqueue(enc.encode(`${JSON.stringify(ev)}\n`));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
