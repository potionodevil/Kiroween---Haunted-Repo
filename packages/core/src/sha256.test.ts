import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { sha256Hex } from "./sha256";

describe("sha256Hex", () => {
  it("matches the FIPS test vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("property: equals node:crypto for any string", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 300 }), (s) => {
        expect(sha256Hex(s)).toBe(createHash("sha256").update(s, "utf8").digest("hex"));
      }),
      { numRuns: 300 },
    );
  });
});
