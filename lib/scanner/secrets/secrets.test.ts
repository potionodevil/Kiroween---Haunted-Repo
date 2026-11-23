import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { shannonEntropy } from "./entropy";
import { mask, MASK_CHAR } from "./mask";
import { SECRET_RULES } from "./rules";
import { collectGhosts, scanLine, scanPatch, scanText } from "./scan";
import { FAKE } from "./fixtures";

const ctx = { file: "config/payments.js", commit: "a3f91c2", date: "2026-03-14" };
const rulesOf = (text: string) => scanLine(text, 1, ctx).map((h) => h.rule.id);

describe("shannonEntropy", () => {
  it("is 0 for empty and single-char strings", () => {
    expect(shannonEntropy("")).toBe(0);
    expect(shannonEntropy("aaaa")).toBe(0);
  });
  it("is 1 for two equally likely chars", () => {
    expect(shannonEntropy("abab")).toBeCloseTo(1);
  });
  it("never exceeds log2(length)", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (s) => {
        expect(shannonEntropy(s)).toBeLessThanOrEqual(Math.log2(Array.from(s).length) + 1e-9);
      }),
    );
  });
});

describe("mask", () => {
  it("keeps prefix and last 4", () => {
    expect(mask(FAKE.awsAccess, 4)).toBe(`AKIA${MASK_CHAR.repeat(12)}NB4T`);
  });
  it("shows no body chars for short bodies", () => {
    expect(mask("hunter2")).toBe(MASK_CHAR.repeat(7));
  });
  it("property: never reveals more than 4 body chars", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 200 }), fc.nat(12), (secret, keep) => {
        const chars = Array.from(secret);
        const p = Math.min(keep, chars.length);
        const out = Array.from(mask(secret, keep));
        const body = chars.slice(p);
        const shown = out.slice(p).filter((c) => c !== MASK_CHAR);
        expect(shown.length).toBeLessThanOrEqual(4);
        // whatever is shown comes from the last 4 body chars only
        const lastFour = body.slice(-4).filter((c) => c !== MASK_CHAR);
        expect(lastFour.join("").endsWith(shown.join(""))).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
});

describe("secret rules: positives", () => {
  const cases: [string, string][] = [
    ["secret/aws-access-key", `const id = "${FAKE.awsAccess}";`],
    ["secret/aws-secret-key", `aws_secret_access_key = ${FAKE.awsSecret}`],
    ["secret/stripe-live-key", `const stripe = new Stripe("${FAKE.stripeLive}")`],
    ["secret/stripe-test-key", `STRIPE_KEY=${FAKE.stripeTest}`],
    ["secret/github-token", `token: ${FAKE.github}`],
    ["secret/slack-token", `SLACK=${FAKE.slack}`],
    ["secret/google-api-key", `apiKey: "${FAKE.google}"`],
    ["secret/openai-style-key", `OPENAI=${FAKE.ai}`],
    ["secret/private-key", FAKE.privateKeyHeader],
    ["secret/generic-secret", `JWT_SECRET=Zq8rT2mW9xLp`],
    ["secret/high-entropy", `const sessionToken = "${FAKE.randomToken}";`],
  ];
  it.each(cases)("%s matches", (rule, line) => {
    expect(rulesOf(line)).toContain(rule);
  });
  it("has at least 10 named rules", () => {
    expect(SECRET_RULES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("secret rules: negatives", () => {
  const cases = [
    `const id = "AKIA_NOT_A_KEY";`,
    `const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)`,
    `JWT_SECRET=process.env.JWT_SECRET`,
    `PASSWORD=<your-password>`,
    `const token = "aaaaaaaaaaaaaaaaaaaaaaaa";`,
    `// see https://docs.stripe.com/keys`,
    `const sk = "sk_live_short";`,
  ];
  it.each(cases)("no hit: %s", (line) => {
    expect(rulesOf(line)).toEqual([]);
  });
});

describe("severity", () => {
  it("live stripe key is critical", () => {
    expect(scanLine(`k=${FAKE.stripeLive}`, 1, ctx)[0]?.severity).toBe("critical");
  });
  it("sample-looking values drop to low", () => {
    const sample = ["AK", "IA", "IOSFODNN7EXAMPLE"].join("");
    expect(scanLine(`id=${sample}`, 1, ctx)[0]?.severity).toBe("low");
  });
});

describe("previews never leak", () => {
  it("preview of every hit hides the raw value", () => {
    for (const value of Object.values(FAKE)) {
      for (const hit of scanLine(`SECRET_KEY="${value}"`, 1, ctx)) {
        expect(hit.preview).not.toContain(value);
        expect(JSON.stringify(hit)).not.toContain(value);
      }
    }
  });
});

describe("scanPatch", () => {
  it("scans only added lines with correct line numbers", () => {
    const patch = [
      "@@ -10,3 +10,4 @@",
      " const a = 1;",
      `-const old = "${FAKE.github}";`,
      `+const key = "${FAKE.stripeLive}";`,
      " const b = 2;",
    ].join("\n");
    const hits = scanPatch(patch, ctx);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.rule.id).toBe("secret/stripe-live-key");
    expect(hits[0]?.line).toBe(11);
  });
});

describe("collectGhosts", () => {
  it("merges one secret across commits and keeps the oldest as firstSeen", () => {
    const newer = scanText(`k=${FAKE.stripeLive}`, { file: "README.md", commit: "9c1d8e4", date: "2026-04-02" });
    const older = scanText(`k=${FAKE.stripeLive}`, { file: "config/payments.js", commit: "a3f91c2", date: "2026-03-14" });
    const ghosts = collectGhosts([...newer, ...older]);
    expect(ghosts).toHaveLength(1);
    const g = ghosts[0]!;
    expect(g.id).toMatch(/^g_[0-9a-f]{10}$/);
    expect(g.commit).toBe("a3f91c2");
    expect(g.ghost?.commitCount).toBe(2);
    expect(g.ghost?.copies).toEqual([{ commit: "9c1d8e4", file: "README.md" }]);
    expect(g.autoFixable).toBe(false);
  });
  it("gives a stable id for the same secret", () => {
    const a = collectGhosts(scanText(`k=${FAKE.github}`, ctx))[0]!;
    const b = collectGhosts(scanText(`x: ${FAKE.github}`, { ...ctx, commit: "1111111" }))[0]!;
    expect(a.id).toBe(b.id);
  });
});

describe("robustness", () => {
  it("property: scanning random text never throws", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary", maxLength: 500 }), (s) => {
        expect(() => scanText(s, ctx)).not.toThrow();
        expect(() => scanPatch(s, ctx)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });
  it("property: every rule handles random input", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (s) => {
        for (const r of SECRET_RULES) expect(() => r.pattern.exec(s)).not.toThrow();
      }),
    );
  });
});
