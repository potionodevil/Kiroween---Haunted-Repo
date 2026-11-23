import { badgeSvg, DEMO_RESULT, parseRepo } from "@haunted/core";
import { scanRepo } from "@/lib/scan";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Scores per repo for one hour, so README badges do not rescan on every view. */
const cache = new Map<string, { score: number; at: number }>();
const TTL = 60 * 60 * 1000;

function svg(score: number, maxAge: number) {
  return new Response(badgeSvg(score), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}` },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("demo") === "1") return svg(DEMO_RESULT.score, 86400);
  const ref = parseRepo(url.searchParams.get("repo") ?? "");
  if (!ref) return new Response("unknown repo", { status: 400 });
  const key = `${ref.owner}/${ref.repo}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return svg(hit.score, 3600);
  try {
    const r = await scanRepo(ref);
    cache.set(key, { score: r.score, at: Date.now() });
    return svg(r.score, 3600);
  } catch {
    return new Response("scan failed", { status: 502 });
  }
}
