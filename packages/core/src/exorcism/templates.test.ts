import { describe, expect, it } from "vitest";
import { SECRET_RULES } from "../secrets/rules";
import { collectGhosts, scanText } from "../secrets/scan";
import { FAKE } from "../secrets/fixtures";
import { DEMO_RESULT } from "../demo/spooky-shop";
import { buildRitual, TEMPLATE_BY_RULE } from "./templates";

describe("ritual templates", () => {
  it("covers every secret rule", () => {
    for (const r of SECRET_RULES) expect(TEMPLATE_BY_RULE[r.id], r.id).toBeDefined();
  });

  it("builds 4 steps in ritual order with commit count", () => {
    const ghost = DEMO_RESULT.findings.find((f) => f.rule === "secret/stripe-live-key")!;
    const steps = buildRitual(ghost);
    expect(steps.map((s) => s.id)).toEqual(["rotate", "env", "history", "guard"]);
    expect(steps[0]!.title).toBe("Roll the key in Stripe");
    expect(steps[2]!.body).toContain("47 commits");
  });

  it("never contains the raw secret or its masked preview", () => {
    const line = Object.values(FAKE).map((v, i) => `K${i}="${v}"`).join("\n");
    for (const ghost of collectGhosts(scanText(line, { file: "a.ts", commit: "abc1234", date: null }))) {
      const text = JSON.stringify(buildRitual(ghost));
      for (const raw of Object.values(FAKE)) expect(text).not.toContain(raw);
      expect(text).not.toContain(ghost.masked!);
    }
  });
});
