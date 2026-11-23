/**
 * Prepared séance run for the demo repo (feature 26, demo-first).
 * Each line has a delay in ms after the previous one. The real Vercel Sandbox runner replaces this in M3.
 */
export type SeanceTone = "cmd" | "info" | "ok" | "fail" | "dim";

export interface SeanceLine {
  delay: number;
  text: string;
  tone: SeanceTone;
  /** Marks a phase change for the proof panel. */
  phase?: "before-failed" | "fix-applied" | "after-passed";
}

export const SEANCE_FINDING = {
  kind: "spider" as const,
  title: "SQL built from user input",
  file: "src/orders.ts",
  line: 42,
  proofTest: `it('treats order ids as data', async () => {
  const id = "1 OR 1=1";
  const rows = await findOrders(id);
  expect(rows).toHaveLength(0);
});`,
};

export const SEANCE_RUN: SeanceLine[] = [
  { delay: 300, text: "$ sandbox create --runtime node22 --vcpus 2", tone: "cmd" },
  { delay: 700, text: "sandbox sb_7f3a ready (egress: npm registry only)", tone: "dim" },
  { delay: 400, text: "$ git clone --depth 1 rene/spooky-shop @ a3f91c2", tone: "cmd" },
  { delay: 600, text: "cloned 142 files", tone: "dim" },
  { delay: 400, text: "$ npm ci --ignore-scripts", tone: "cmd" },
  { delay: 1200, text: "added 418 packages in 9.8s (lifecycle scripts skipped)", tone: "dim" },
  { delay: 300, text: "network closed", tone: "info" },
  { delay: 400, text: "$ npm run build", tone: "cmd" },
  { delay: 1000, text: "build ok in 6.1s", tone: "ok" },
  { delay: 400, text: "$ npx vitest run test/haunted/orders.proof.test.ts", tone: "cmd" },
  { delay: 900, text: "✗ treats order ids as data", tone: "fail" },
  { delay: 200, text: "  expected [ …12 rows ] to have a length of 0 but got 12", tone: "fail" },
  { delay: 200, text: "  at src/orders.ts:42  db.query(`SELECT * FROM orders WHERE id = ${id}`)", tone: "dim", phase: "before-failed" },
  { delay: 700, text: "The spider is real: the test reads every order with a crafted id.", tone: "info" },
  { delay: 600, text: "$ git apply haunted-fix-spider-sql-concat.patch", tone: "cmd" },
  { delay: 400, text: "src/orders.ts: parameterized query ($1)", tone: "dim", phase: "fix-applied" },
  { delay: 400, text: "$ npx vitest run", tone: "cmd" },
  { delay: 1300, text: "✓ treats order ids as data", tone: "ok" },
  { delay: 200, text: "✓ 47 other tests passed", tone: "ok", phase: "after-passed" },
  { delay: 500, text: "Fix proven: tests fail before, pass after. Ready for a pull request.", tone: "info" },
  { delay: 300, text: "sandbox sb_7f3a destroyed", tone: "dim" },
];
