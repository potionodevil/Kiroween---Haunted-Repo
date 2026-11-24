import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { guard } from "@/lib/guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = guard(req, { name: "logout", max: 20, windowMs: 60000 });
  if (blocked) return blocked;
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
