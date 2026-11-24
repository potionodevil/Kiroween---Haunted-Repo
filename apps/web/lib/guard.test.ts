import { describe, expect, it } from "vitest";
import { guard, rateLimit, sameOrigin } from "./guard";

const req = (headers: Record<string, string>) => new Request("https://haunted.example/api/fix-pr", { method: "POST", headers });

describe("sameOrigin", () => {
  it("allows the own site and blocks others", () => {
    expect(sameOrigin(req({ origin: "https://haunted.example" }))).toBe(true);
    expect(sameOrigin(req({ origin: "https://evil.example" }))).toBe(false);
    expect(sameOrigin(req({ origin: "null" }))).toBe(false);
  });
  it("falls back to Sec-Fetch-Site without Origin", () => {
    expect(sameOrigin(req({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(sameOrigin(req({}))).toBe(false);
  });
});

describe("rateLimit", () => {
  it("lets max requests through per window, then blocks until it ends", () => {
    const k = `t:${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(k, 3, 1000, 0).ok).toBe(true);
    const r = rateLimit(k, 3, 1000, 400);
    expect(r).toEqual({ ok: false, retryAfter: 1 });
    expect(rateLimit(k, 3, 1000, 1000).ok).toBe(true);
  });
});

describe("guard", () => {
  it("returns 403 for cross-site and 429 when over the limit", () => {
    expect(guard(req({ origin: "https://evil.example" }), { name: "x", max: 1, windowMs: 1000 })?.status).toBe(403);
    const ok = req({ origin: "https://haunted.example", "x-forwarded-for": `1.2.3.${Math.floor(Math.random() * 200)}` });
    const opts = { name: `y${Math.random()}`, max: 1, windowMs: 60_000 };
    expect(guard(ok, opts)).toBeNull();
    expect(guard(ok, opts)?.status).toBe(429);
  });
});
