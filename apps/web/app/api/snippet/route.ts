import { NextResponse } from "next/server";
import { parseRepo, redactLine } from "@haunted/core";
import { raw } from "@haunted/github";
import { guard } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTEXT = 5;
const REF = /^[A-Za-z0-9._/-]{1,100}$/;

/**
 * A few lines of code around a finding, for the hover popup.
 * Every line passes through redactLine, so a secret on that line shows as <REDACTED> (security.md rule 1).
 */
export async function GET(req: Request) {
  const blocked = guard(req, { name: "snippet", max: 120, windowMs: 60_000, origin: false });
  if (blocked) return blocked;
  const u = new URL(req.url);
  const ref = parseRepo(u.searchParams.get("repo") ?? "");
  const file = u.searchParams.get("file") ?? "";
  const at = u.searchParams.get("ref") ?? "";
  const line = Number(u.searchParams.get("line") ?? 0);
  if (!ref || !file || file.includes("..") || file.startsWith("/") || !REF.test(at) || !Number.isInteger(line) || line < 0) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const text = await raw(ref.owner, ref.repo, at, file).catch(() => null);
  if (text === null) return NextResponse.json({ error: "File not found at that commit" }, { status: 404 });
  const all = text.split("\n");
  const focus = line > 0 ? line : 1;
  const start = Math.max(1, focus - CONTEXT);
  const end = Math.min(all.length, focus + CONTEXT);
  const lines = all.slice(start - 1, end).map((l) => redactLine(l.length > 240 ? `${l.slice(0, 240)}…` : l));
  return NextResponse.json({ start, line: line || null, lines }, { headers: { "Cache-Control": "private, max-age=300" } });
}
