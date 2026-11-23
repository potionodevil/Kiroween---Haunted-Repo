import { describe, expect, it } from "vitest";
import { DEMO_RESULT } from "../demo/spooky-shop";
import { autopsyMarkdown, badgeSvg, cycloneDx } from "./report";

describe("autopsy report", () => {
  it("lists every open finding with severity, CWE, location and fix", () => {
    const md = autopsyMarkdown(DEMO_RESULT, { generatedAt: "2026-11-23T00:00:00Z" });
    for (const f of DEMO_RESULT.findings) {
      expect(md).toContain(f.title.replace(/\|/g, "\\|"));
      if (f.cwe) expect(md).toContain(f.cwe);
    }
    expect(md).toContain("## Critical");
    expect(md).toContain("Haunting score: **100 / 100**");
  });
  it("leaves banished findings out", () => {
    const first = DEMO_RESULT.findings[0]!;
    const md = autopsyMarkdown(DEMO_RESULT, { banished: new Set([first.id]) });
    expect(md).toContain(`Open findings: ${DEMO_RESULT.findings.length - 1}`);
  });
  it("never contains more than the masked value of a secret", () => {
    const md = autopsyMarkdown(DEMO_RESULT);
    expect(md).not.toMatch(/sk_live_[A-Za-z0-9]{8,}/);
  });
});

describe("SBOM and badge", () => {
  it("builds CycloneDX components with purls", () => {
    const bom = cycloneDx({ ...DEMO_RESULT, packages: [{ name: "@scope/a", version: "1.0.0", ecosystem: "npm" }, { name: "django", version: "3.2.1", ecosystem: "PyPI" }] });
    expect(bom.bomFormat).toBe("CycloneDX");
    expect(bom.components.map((c) => c.purl)).toEqual(["pkg:npm/%40scope/a@1.0.0", "pkg:pypi/django@3.2.1"]);
  });
  it("badge shows the score", () => {
    expect(badgeSvg(42)).toContain("42/100");
  });
});
