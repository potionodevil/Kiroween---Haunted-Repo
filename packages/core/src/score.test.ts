import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { Finding, Severity } from "./types";
import { score, scoreLabel } from "./score";

const f = (id: string, severity: Severity): Finding => ({
  id, severity, kind: "zombie", rule: "r", title: "t", file: "a.ts", line: 1,
  commit: null, message: "", fix: "", autoFixable: false, patch: null,
});

describe("score", () => {
  it("weights critical 20, warning 8, low 3", () => {
    expect(score([f("a", "critical"), f("b", "warning"), f("c", "low")])).toBe(31);
  });
  it("caps at 100", () => {
    expect(score(Array.from({ length: 9 }, (_, i) => f(String(i), "critical")))).toBe(100);
  });
  it("drops when a finding is banished", () => {
    expect(score([f("a", "critical"), f("b", "low")], new Set(["a"]))).toBe(3);
  });
  it("labels", () => {
    expect(scoreLabel(0)).toBe("The house is quiet");
    expect(scoreLabel(12)).toBe("A little drafty");
    expect(scoreLabel(45)).toBe("Haunted");
    expect(scoreLabel(92)).toBe("Badly haunted");
  });
  it("property: banishing never raises the score and result stays in 0..100", () => {
    const sev = fc.constantFrom<Severity>("critical", "warning", "low");
    fc.assert(
      fc.property(fc.array(sev, { maxLength: 30 }), fc.nat(30), (sevs, k) => {
        const list = sevs.map((s, i) => f(String(i), s));
        const full = score(list);
        const less = score(list, new Set([String(k)]));
        expect(less).toBeLessThanOrEqual(full);
        expect(full).toBeGreaterThanOrEqual(0);
        expect(full).toBeLessThanOrEqual(100);
      }),
    );
  });
});
