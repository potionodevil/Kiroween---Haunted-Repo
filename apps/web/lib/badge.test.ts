import { describe, expect, it } from "vitest";
import { insertBadge } from "./badge";

describe("insertBadge", () => {
  it("goes under the first heading with a marker", () => {
    expect(insertBadge("# App\nText", "[B]")).toBe("# App\n\n<!-- haunted-repo: badge -->\n[B]\nText");
  });
  it("goes on top without a heading", () => {
    expect(insertBadge("Just text", "[B]")).toBe("<!-- haunted-repo: badge -->\n[B]\n\nJust text");
  });
});
