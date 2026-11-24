import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { synthLine, synthPatch } from "./synth";
import { applyPatchText } from "./apply";
import type { Finding } from "../types";

describe("synthLine", () => {
  it("adds a catch to a floating promise", () => {
    expect(synthLine("zombie/floating-promise", "  loadProjects(id);")).toBe("  loadProjects(id).catch((err) => console.error(err));");
    expect(synthLine("zombie/floating-promise", "  api.save(x).then(done)")).toBe("  api.save(x).then(done).catch((err) => console.error(err));");
  });
  it("leaves lines it cannot fix safely", () => {
    expect(synthLine("zombie/floating-promise", "  await save();")).toBeNull();
    expect(synthLine("zombie/floating-promise", "  save(a, (b) => {")).toBeNull();
    expect(synthLine("zombie/floating-promise", "  save().catch(log);")).toBeNull();
  });
  it("fixes spiders on one line", () => {
    expect(synthLine("spider/inner-html", "el.innerHTML = name;")).toBe("el.textContent = name;");
    expect(synthLine("spider/tls-off", "  rejectUnauthorized: false,")).toBe("  rejectUnauthorized: true,");
    expect(synthLine("spider/weak-hash", 'createHash("md5")')).toBe('createHash("sha256")');
  });
  it("never throws and never returns the same line", () => {
    fc.assert(
      fc.property(fc.constantFrom("zombie/floating-promise", "spider/inner-html", "spider/tls-off", "spider/weak-hash", "x/y"), fc.string(), (r, l) => {
        const out = synthLine(r, l);
        return out === null || out !== l;
      }),
    );
  });
});

describe("synthPatch", () => {
  it("produces a patch that applies with a marker", () => {
    const f = { id: "z_1", kind: "zombie", severity: "critical", rule: "zombie/floating-promise", title: "t", file: "src/a.ts", line: 2, message: "m", fix: "x", autoFixable: false } as Finding;
    const src = "const a = 1;\n  load(a);\nend();";
    const p = synthPatch(f, "  load(a);")!;
    expect(applyPatchText(src, p, "src/a.ts", f.rule)).toBe("const a = 1;\n  // haunted-repo: zombie/floating-promise\n  load(a).catch((err) => console.error(err));\nend();");
  });
});
