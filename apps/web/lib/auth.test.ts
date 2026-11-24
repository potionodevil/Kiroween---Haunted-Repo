import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined) }),
}));

process.env.HAUNTED_SEAL_KEY = "test-seal-key";
const { SESSION_COOKIE, getSession, safeNext, sessionCookieValue } = await import("./auth");

describe("safeNext", () => {
  it("keeps relative paths and blocks open redirects", () => {
    expect(safeNext("/house?repo=a/b")).toBe("/house?repo=a/b");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});

describe("session cookie", () => {
  beforeEach(() => jar.clear());

  it("round-trips and never shows the token in clear text", async () => {
    const v = sessionCookieValue({ token: "ghu_secretvalue123", login: "potion", exp: Date.now() + 60_000 });
    expect(v).not.toContain("ghu_");
    jar.set(SESSION_COOKIE, v);
    expect((await getSession())?.login).toBe("potion");
  });

  it("rejects expired, tampered or missing cookies", async () => {
    expect(await getSession()).toBeNull();
    jar.set(SESSION_COOKIE, sessionCookieValue({ token: "t", login: "x", exp: Date.now() - 1 }));
    expect(await getSession()).toBeNull();
    const ok = sessionCookieValue({ token: "t", login: "x", exp: Date.now() + 60_000 });
    jar.set(SESSION_COOKIE, ok.slice(0, -2) + (ok.endsWith("A") ? "BB" : "AA"));
    expect(await getSession()).toBeNull();
  });
});
