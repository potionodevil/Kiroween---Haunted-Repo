import { beforeEach, describe, expect, it, vi } from "vitest";

/** Fake GitHub: one repo with src/a.ts, records every write. */
const files: Record<string, string> = { "src/a.ts": "const a = 1;\nif (a == 1) go();\n" };
const calls: { method: string; path: string; body?: Record<string, unknown> }[] = [];
let push = true;

vi.mock("@/lib/auth", () => ({
  INSTALL_URL: "https://github.com/apps/haunted-repo/installations/new",
  getSession: async () => ({ token: "t", login: "owner", exp: Date.now() + 60_000 }),
  canPush: async () => push,
  userApi: async (_t: string, path: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ method, path, body });
    if (method === "GET" && path === "/repos/o/r") return { ok: true, status: 200, data: { default_branch: "main" } };
    if (path.includes("/git/ref/heads/main")) return { ok: true, status: 200, data: { object: { sha: "abc" } } };
    if (method === "POST" && path.endsWith("/git/refs")) return { ok: true, status: 201, data: {} };
    const m = /\/contents\/(.+?)(\?|$)/.exec(path);
    if (m && method === "GET") {
      const f = decodeURIComponent(m[1]!);
      return f in files ? { ok: true, status: 200, data: { content: Buffer.from(files[f]!).toString("base64"), sha: "s1" } } : { ok: false, status: 404, data: {} };
    }
    if (m && method === "PUT") return { ok: true, status: 200, data: {} };
    if (path.endsWith("/pulls")) return { ok: true, status: 201, data: { html_url: "https://github.com/o/r/pull/7", number: 7 } };
    return { ok: false, status: 500, data: {} };
  },
}));

const { POST } = await import("./route");
const patch = "--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,2 +1,2 @@\n const a = 1;\n-if (a == 1) go();\n+if (a === 1) go();\n";
const req = (body: unknown, origin = "https://h.example") =>
  new Request("https://h.example/api/fix-pr", { method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": `9.9.9.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify(body) });

describe("POST /api/fix-pr", () => {
  beforeEach(() => {
    calls.length = 0;
    push = true;
  });

  it("opens one PR on a new branch and marks the changed line", async () => {
    const res = await POST(req({ repo: "o/r", mark: true, fixes: [{ rule: "zombie/eqeqeq", title: "Loose equality", patch }] }));
    const d = (await res.json()) as { url?: string };
    expect(d.url).toBe("https://github.com/o/r/pull/7");
    const put = calls.find((c) => c.method === "PUT")!;
    const written = Buffer.from(String(put.body!.content), "base64").toString("utf8");
    expect(written).toBe("const a = 1;\n// haunted-repo: zombie/eqeqeq\nif (a === 1) go();\n");
    expect(String(put.body!.branch)).toMatch(/^haunted-repo\/exorcism-/);
    expect(calls.some((c) => c.method === "PUT" && String(c.body?.branch) === "main")).toBe(false);
  });

  it("never auto-fixes secrets", async () => {
    const res = await POST(req({ repo: "o/r", fixes: [{ rule: "secret/aws-access-key", title: "x", patch }] }));
    expect(res.status).toBe(400);
  });

  it("refuses without push access and from other sites", async () => {
    push = false;
    expect((await POST(req({ repo: "o/r", fixes: [{ rule: "zombie/eqeqeq", title: "x", patch }] }))).status).toBe(403);
    push = true;
    expect((await POST(req({ repo: "o/r", fixes: [] }, "https://evil.example"))).status).toBe(403);
  });
});
