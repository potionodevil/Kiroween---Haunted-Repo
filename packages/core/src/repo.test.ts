import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { parseRepo } from "./repo";

describe("parseRepo", () => {
  it.each([
    ["rene/spooky-shop", "rene", "spooky-shop"],
    ["https://github.com/rene/spooky-shop", "rene", "spooky-shop"],
    ["github.com/rene/spooky-shop.git", "rene", "spooky-shop"],
    ["https://github.com/rene/spooky-shop/tree/main/src", "rene", "spooky-shop"],
    ["  https://www.github.com/a.b/c_d?tab=readme  ", "a.b", "c_d"],
  ])("accepts %s", (input, owner, repo) => {
    expect(parseRepo(input)).toEqual({ owner, repo });
  });

  it.each(["", "rene", "https://gitlab.com/a/b/c", "a b/c", "../etc", "a/b/c", "a/..", "<script>/x"])(
    "rejects %s",
    (input) => {
      expect(parseRepo(input)).toBeNull();
    },
  );

  it("property: never throws and output always matches the name pattern", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const r = parseRepo(s);
        if (r) {
          expect(r.owner).toMatch(/^[A-Za-z0-9_.-]{1,100}$/);
          expect(r.repo).toMatch(/^[A-Za-z0-9_.-]{1,100}$/);
        }
      }),
    );
  });
});
