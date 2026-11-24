import { NextResponse } from "next/server";
import { forward, validate } from "@/lib/ai-proxy";
import { guard } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Forwards one AI request for OpenAI or Mistral. Nothing is stored or logged. */
export async function POST(req: Request) {
  const blocked = guard(req, { name: "ai", max: 30, windowMs: 60000 });
  if (blocked) return blocked;
  const input = validate(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const r = await forward(input);
  return NextResponse.json(r.body, { status: r.status, headers: { "Cache-Control": "no-store" } });
}
