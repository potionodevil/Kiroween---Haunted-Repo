import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { applyParsed, applyPatchText, parsePatches } from "./apply";
import { unifiedPatch } from "../code/patch";
import { redactLine } from "../secrets/redact";

describe("applyPatchText", () => {
  it("applies a patch made by unifiedPatch", () => {
    const before = "a\nif (x == 1) {\n  go();\n}\n";
    const after = "a\nif (x === 1) {\n  go();\n}\n";
    const patch = unifiedPatch("src/x.ts", before, after)!;
    expect(applyPatchText(before, patch, "src/x.ts")).toBe(after);
  });

  it("marks the changed line with a comment", () => {
    const before = "a\n  if (x == 1) go();\nb";
    const patch = unifiedPatch("src/x.ts", before, "a\n  if (x === 1) go();\nb")!;
    expect(applyPatchText(before, patch, "src/x.ts", "zombie/eqeqeq")).toBe("a\n  // haunted-repo: zombie/eqeqeq\n  if (x === 1) go();\nb");
  });

  it("uses # in YAML and nothing in JSON", () => {
    const y = unifiedPatch("ci.yml", "a\nb: 1\n", "a\nb: 2\n")!;
    expect(applyPatchText("a\nb: 1\n", y, "ci.yml", "fix")).toContain("# haunted-repo: fix");
    const j = unifiedPatch("package.json", "{\n\"a\": 1\n}", "{\n\"a\": 2\n}")!;
    expect(applyPatchText("{\n\"a\": 1\n}", j, "package.json", "fix")).toBe("{\n\"a\": 2\n}");
  });

  it("creates a file from /dev/null", () => {
    const p = "--- /dev/null\n+++ b/SECURITY.md\n@@ -0,0 +1,2 @@\n+# Security\n+Mail us.\n";
    expect(applyParsed("", parsePatches(p)[0]!)).toBe("# Security\nMail us.");
  });

  it("refuses a patch that does not fit", () => {
    const patch = unifiedPatch("f.ts", "a\nb\nc", "a\nB\nc")!;
    expect(applyPatchText("a\nX\nc", patch, "f.ts")).toBeNull();
  });

  it("round-trips any single-region edit", () => {
    const line = fc.string({ maxLength: 8 }).filter((s) => !s.includes("\n"));
    fc.assert(
      fc.property(fc.array(line, { minLength: 1, maxLength: 12 }), fc.array(line, { maxLength: 4 }), fc.nat(12), (lines, ins, at) => {
        const before = lines.join("\n");
        const i = Math.min(at, lines.length);
        const after = [...lines.slice(0, i), ...ins, ...lines.slice(i + 1)].join("\n");
        const patch = unifiedPatch("f.ts", before, after);
        if (!patch) return;
        expect(applyPatchText(before, patch, "f.ts")).toBe(after);
      }),
    );
  });
});

describe("redactLine", () => {
  it("hides a token in log output", () => {
    const tok = "ghp_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8";
    const out = redactLine(`token=${tok} done`);
    expect(out).not.toContain(tok);
    expect(out).toContain("<REDACTED>");
  });
  it("leaves plain lines alone and never throws", () => {
    expect(redactLine("PASS src/a.test.ts")).toBe("PASS src/a.test.ts");
    fc.assert(fc.property(fc.string(), (s) => typeof redactLine(s) === "string"));
  });
});
