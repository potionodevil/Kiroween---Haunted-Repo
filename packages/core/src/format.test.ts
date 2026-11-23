import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { CREATURE_KINDS } from "./types";
import { stableId } from "./id";
import { isValidFinding } from "./validate";
import { DEMO_RESULT } from "./demo/spooky-shop";
import { collectGhosts, scanPatch, scanText } from "./secrets/scan";
import { FAKE } from "./secrets/fixtures";

const ctx = { file: "a.ts", commit: "abc1234", date: "2026-01-01T00:00:00Z" };

describe("stableId", () => {
  it("is deterministic and kind-prefixed", () => {
    expect(stableId("vampire", ["osv/GHSA-1", "lodash", "4.17.15"])).toBe(stableId("vampire", ["osv/GHSA-1", "lodash", "4.17.15"]));
    expect(stableId("spider", ["r", "f", 1, "c"])).toMatch(/^s_[0-9a-f]{12}$/);
  });
  it("property: different parts give different ids (no collisions in practice)", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        fc.pre(a !== b);
        expect(stableId("zombie", [a])).not.toBe(stableId("zombie", [b]));
      }),
    );
  });
  it("separates parts so ['ab','c'] differs from ['a','bc']", () => {
    expect(stableId("bat", ["ab", "c"])).not.toBe(stableId("bat", ["a", "bc"]));
  });
});

describe("finding format", () => {
  it("demo has every creature kind and only valid findings", () => {
    const kinds = new Set(DEMO_RESULT.findings.map((f) => f.kind));
    for (const k of CREATURE_KINDS) expect(kinds.has(k), k).toBe(true);
    for (const f of DEMO_RESULT.findings) expect(isValidFinding(f), f.title).toBe(true);
    expect(new Set(DEMO_RESULT.findings.map((f) => f.id)).size).toBe(DEMO_RESULT.findings.length);
  });

  it("ghosts carry CWE, OWASP, blast radius and masked value", () => {
    const [g] = collectGhosts(scanText(`k=${FAKE.stripeLive}`, ctx));
    expect(g).toMatchObject({ cwe: "CWE-798", owasp: "A07:2021", kind: "ghost" });
    expect(g!.blastRadius).toContain("charges");
    expect(g!.masked).toMatch(/^sk_live_•+[A-Za-z0-9]{4}$/);
  });

  it("marks ghosts deleted at HEAD but still in history", () => {
    const history = scanText(`k=${FAKE.github}`, ctx);
    const head = scanText(`k=${FAKE.stripeLive}`, { file: "b.ts", commit: "HEAD", date: null });
    const ghosts = collectGhosts([...history, ...scanText(`k=${FAKE.stripeLive}`, ctx)], head);
    const gh = ghosts.find((f) => f.rule === "secret/github-token")!;
    const st = ghosts.find((f) => f.rule === "secret/stripe-live-key")!;
    expect(gh.ghost?.deletedAtHead).toBe(true);
    expect(gh.message).toContain("still in history");
    expect(st.ghost?.deletedAtHead).toBe(false);
  });

  it("property: ghost scanning returns only valid findings on random input", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 400 }), fc.boolean(), (s, asPatch) => {
        const hits = asPatch ? scanPatch(s, ctx) : scanText(s, ctx);
        for (const f of collectGhosts(hits)) expect(isValidFinding(f)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it("rejects malformed findings", () => {
    expect(isValidFinding(null)).toBe(false);
    expect(isValidFinding({ ...DEMO_RESULT.findings[0], id: "nope" })).toBe(false);
    expect(isValidFinding({ ...DEMO_RESULT.findings[0], kind: "werewolf" })).toBe(false);
    expect(isValidFinding({ ...DEMO_RESULT.findings[0], masked: "sk_live_••••abcdefgh" })).toBe(false);
    const skeleton = DEMO_RESULT.findings.find((f) => f.kind === "skeleton")!;
    expect(isValidFinding({ ...skeleton, confidence: undefined })).toBe(false);
  });
});
