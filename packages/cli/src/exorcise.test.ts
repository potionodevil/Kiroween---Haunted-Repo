import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { exorciseFile, undoBackup } from "./exorcise";

const stripeTest = ["sk", "_test_", "51Hq7Lm2Zx9Pw4Rt8Vb3Nc6Kd"].join("");

async function repo(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "haunted-"));
  for (const [p, c] of Object.entries(files)) {
    await mkdir(join(root, p, ".."), { recursive: true });
    await writeFile(join(root, p), c);
  }
  return root;
}

describe("watcher replace step (acceptance criterion)", () => {
  it("moves a Stripe test key to .env.local, updates .gitignore, undo restores byte for byte", async () => {
    const src = `import Stripe from "stripe";\nconst stripe = new Stripe("${stripeTest}");\n`;
    const root = await repo({ "src/pay.ts": src, ".gitignore": "node_modules\n" });
    const r = await exorciseFile(root, "src/pay.ts", { now: () => 1 });
    expect(r?.replaced).toEqual([{ envVar: "STRIPE_SECRET_KEY", rule: "secret/stripe-test-key" }]);
    expect(await readFile(join(root, "src/pay.ts"), "utf8")).toBe(`import Stripe from "stripe";\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY);\n`);
    expect(await readFile(join(root, ".env.local"), "utf8")).toBe(`STRIPE_SECRET_KEY=${stripeTest}\n`);
    const gi = await readFile(join(root, ".gitignore"), "utf8");
    expect(gi).toContain(".env*");
    expect(gi).toContain(".haunted/backup/");
    expect(r!.diff).not.toContain(stripeTest.slice(8));
    expect(r!.diff).toContain("process.env.STRIPE_SECRET_KEY");

    await undoBackup(root, r!.backup);
    expect(await readFile(join(root, "src/pay.ts"), "utf8")).toBe(src);
  });

  it("python and yaml use their own lookups; dry run writes nothing", async () => {
    const root = await repo({ "app.py": `key = "${stripeTest}"\n`, "ci.yml": `token: ${stripeTest}\n` });
    await exorciseFile(root, "app.py");
    expect(await readFile(join(root, "app.py"), "utf8")).toBe(`key = os.environ["STRIPE_SECRET_KEY"]\n`);
    const dry = await exorciseFile(root, "ci.yml", { dryRun: true });
    expect(dry?.diff).toContain("${STRIPE_SECRET_KEY}");
    expect(await readFile(join(root, "ci.yml"), "utf8")).toBe(`token: ${stripeTest}\n`);
  });

  it("returns null when there is nothing to move", async () => {
    const root = await repo({ "a.ts": "export const x = 1;\n" });
    expect(await exorciseFile(root, "a.ts")).toBeNull();
  });

  it("property: replace then undo is the identity", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 80 }), fc.string({ maxLength: 80 }), async (pre, post) => {
        const src = `${pre}\nconst k = "${stripeTest}";\n${post}`;
        const root = await repo({ "f.ts": src });
        const r = await exorciseFile(root, "f.ts", { now: () => 7 });
        if (!r) return;
        await undoBackup(root, r.backup);
        expect(await readFile(join(root, "f.ts"), "utf8")).toBe(src);
      }),
      { numRuns: 25 },
    );
  });
});
