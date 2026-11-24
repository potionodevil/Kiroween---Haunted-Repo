import { NextResponse } from "next/server";

/**
 * Request guards for the API routes.
 * - sameOrigin: blocks cross-site POSTs (a form on another site cannot open PRs or start sandboxes).
 * - rateLimit: fixed window per key, kept in memory per server instance. Best effort on serverless:
 *   it slows abuse of one instance; GitHub's own limits and the owner check stay the real walls.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfter: number } {
  const w = windows.get(key);
  if (!w || now - w.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 5000) for (const [k, v] of windows) if (now - v.start >= windowMs) windows.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  w.count++;
  return w.count <= max ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((w.start + windowMs - now) / 1000) };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Returns an error response when the request must stop, else null. */
export function guard(req: Request, opts: { name: string; max: number; windowMs: number; key?: string; origin?: boolean }): NextResponse | null {
  if (opts.origin !== false && !sameOrigin(req)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const r = rateLimit(`${opts.name}:${opts.key ?? clientIp(req)}`, opts.max, opts.windowMs);
  if (!r.ok) {
    return NextResponse.json({ error: `Too many requests. Try again in ${r.retryAfter} s.` }, { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
  }
  return null;
}
