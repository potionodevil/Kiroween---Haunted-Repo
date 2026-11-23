import type { Finding, ScanResult } from "../types";
import { score, sortFindings } from "../score";
import { stableId } from "../id";
import { blastRadiusFor } from "../secrets/blast-radius";

/**
 * Prepared scan of a made-up repo with every creature kind (R8).
 * Masked values are invented; no real key exists behind them.
 */
const raw: Omit<Finding, "id">[] = [
  {
    kind: "ghost", severity: "critical", rule: "secret/stripe-live-key", cwe: "CWE-798", owasp: "A07:2021",
    title: "Stripe live key", file: "config/payments.js", line: 12, commit: "a3f91c2", introducedAt: "2026-03-14T10:21:00Z",
    message: "A live Stripe secret key was committed on 14 Mar 2026. The file no longer has it, but it is still in history.",
    fix: "Roll the key in the Stripe dashboard, move it to an environment variable, then rewrite history with git filter-repo.",
    blastRadius: blastRadiusFor("secret/stripe-live-key"),
    autoFixable: false, masked: "sk_live_••••••••••••4f2a", evidence: ["README.md@9c1d8e4"],
    ghost: {
      firstSeen: { commit: "a3f91c2", date: "2026-03-14T10:21:00Z", file: "config/payments.js", line: 12 },
      copies: [{ commit: "9c1d8e4", file: "README.md example", date: "2026-04-02T09:00:00Z" }],
      commitCount: 47, deletedAtHead: true, deletedAt: "2026-06-20T15:30:00Z",
    },
  },
  {
    kind: "ghost", severity: "critical", rule: "secret/aws-access-key", cwe: "CWE-798", owasp: "A07:2021",
    title: "AWS access key", file: ".env.production", line: 3, commit: "7be20d4", introducedAt: "2026-02-02T08:05:00Z",
    message: "An AWS access key id was committed in .env.production. Paired with its secret it opens your AWS account.",
    fix: "Deactivate the key in IAM, create a new one, store it in an environment variable, then rewrite history.",
    blastRadius: blastRadiusFor("secret/aws-access-key"),
    autoFixable: false, masked: "AKIA••••••••••••Q7XM",
    ghost: {
      firstSeen: { commit: "7be20d4", date: "2026-02-02T08:05:00Z", file: ".env.production", line: 3 },
      copies: [], commitCount: 112, deletedAtHead: false,
    },
  },
  {
    kind: "vampire", severity: "critical", rule: "osv/GHSA-demo-9x4q-lodash", cwe: "CWE-1321", owasp: "A06:2021",
    title: "Prototype pollution in lodash 4.17.15", file: "package-lock.json",
    message: "lodash 4.17.15 lets crafted input change Object.prototype. Every object in your app can be affected.",
    fix: "Upgrade lodash to 4.17.21.",
    autoFixable: true, dependencyPath: ["express-utils@2.1.0", "lodash@4.17.15"], minimalUpgrade: "4.17.21",
    references: ["https://osv.dev/list?q=lodash"],
    patch: "--- a/package.json\n+++ b/package.json\n@@ -14,1 +14,1 @@\n-    \"lodash\": \"4.17.15\",\n+    \"lodash\": \"4.17.21\",\n",
  },
  {
    kind: "spider", severity: "critical", rule: "spider/sql-concat", cwe: "CWE-89", owasp: "A03:2021",
    title: "SQL built from user input", file: "src/orders.ts", line: 31,
    message: "The order id from the URL is glued into a SQL string. An attacker can read or delete any table.",
    fix: "Use a parameterized query: db.query('SELECT * FROM orders WHERE id = $1', [id]).",
    autoFixable: true,
    patch: "--- a/src/orders.ts\n+++ b/src/orders.ts\n@@ -31,1 +31,1 @@\n-  const rows = await db.query(`SELECT * FROM orders WHERE id = ${req.params.id}`);\n+  const rows = await db.query(\"SELECT * FROM orders WHERE id = $1\", [req.params.id]);\n",
  },
  {
    kind: "possessed", severity: "critical", rule: "possessed/llm-output-to-shell", cwe: "CWE-78", owasp: "A03:2021",
    title: "Model output runs as a shell command", file: "src/agent/tools.ts", line: 22,
    message: "Text from the language model goes straight into child_process.exec. A prompt injection can run any command.",
    fix: "Allow only a fixed list of commands and ask the user before running one.",
    autoFixable: false,
  },
  {
    kind: "zombie", severity: "critical", rule: "lint/unhandled-promise",
    title: "Unhandled promise", file: "src/checkout.ts", line: 88,
    message: "Payment confirmation is awaited nowhere. A failed request silently loses the order.",
    fix: "Add await and a try/catch that shows the user an error and logs the failure.",
    autoFixable: true,
    patch: "--- a/src/checkout.ts\n+++ b/src/checkout.ts\n@@ -88,1 +88,6 @@\n-  confirmPayment(order);\n+  try {\n+    await confirmPayment(order);\n+  } catch (err) {\n+    showError(\"Payment failed. Please try again.\");\n+    console.error(err);\n+  }\n",
  },
  {
    kind: "poltergeist", severity: "warning", rule: "ci/unpinned-action", cwe: "CWE-829", owasp: "A08:2021",
    title: "Action not pinned to a commit", file: ".github/workflows/deploy.yml", line: 18,
    message: "deploy.yml uses some-org/deploy-action@main. Whoever controls that branch controls your deploy.",
    fix: "Pin the action to a full commit SHA.",
    autoFixable: true,
    patch: "--- a/.github/workflows/deploy.yml\n+++ b/.github/workflows/deploy.yml\n@@ -18,1 +18,1 @@\n-      - uses: some-org/deploy-action@main\n+      - uses: some-org/deploy-action@3f1c2a9d8e7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d # main\n",
  },
  {
    kind: "banshee", severity: "warning", rule: "run/failing-test",
    title: "Test fails: cart total with discount", file: "test/cart.test.ts", line: 40,
    message: "Expected 90, received 100. The discount is computed but never applied.",
    fix: "Apply the discount in cartTotal() before returning.",
    autoFixable: false,
  },
  {
    kind: "ghost", severity: "warning", rule: "secret/github-token", cwe: "CWE-798", owasp: "A07:2021",
    title: "GitHub token", file: "scripts/deploy.sh", line: 7, commit: "c41e8a0", introducedAt: "2026-05-19T16:40:00Z",
    message: "A GitHub token was committed in a deploy script. Its scope is unknown.",
    fix: "Revoke the token in GitHub settings, create a new one with the smallest scope, store it as a secret.",
    blastRadius: blastRadiusFor("secret/github-token"),
    autoFixable: false, masked: "ghp_••••••••••••9KdQ",
    ghost: {
      firstSeen: { commit: "c41e8a0", date: "2026-05-19T16:40:00Z", file: "scripts/deploy.sh", line: 7 },
      copies: [], commitCount: 21, deletedAtHead: false,
    },
  },
  {
    kind: "bat", severity: "warning", rule: "perf/query-in-loop",
    title: "N+1 query in loop", file: "src/orders.ts", line: 42,
    message: "A database query runs once per order inside a loop. 100 orders mean 100 round trips.",
    fix: "Load all items in one query with an IN clause, then group them in memory.",
    autoFixable: false,
  },
  {
    kind: "skeleton", severity: "warning", rule: "arch/json-blobs-in-relational", confidence: "medium",
    title: "Relational tables used as JSON storage", file: "prisma/schema.prisma", line: 12,
    message: "7 of 9 tables store one large JSON column that is read and written whole, with almost no joins.",
    fix: "Keep Postgres and index the JSON with jsonb and GIN indexes. A document store is an option, with high migration cost.",
    autoFixable: false, evidence: ["prisma/schema.prisma:12", "src/db/orders.ts:8"],
  },
  {
    kind: "zombie", severity: "warning", rule: "lint/no-unused-vars",
    title: "Unused variable", file: "src/cart.ts", line: 17,
    message: "`discount` is assigned but never used. The discount is probably not applied.",
    fix: "Use the variable or remove it.",
    autoFixable: true,
    patch: "--- a/src/cart.ts\n+++ b/src/cart.ts\n@@ -17,1 +17,0 @@\n-  const discount = getDiscount(user);\n",
  },
  {
    kind: "bat", severity: "warning", rule: "perf/full-library-import",
    title: "Heavy bundle import", file: "src/utils/date.ts", line: 1,
    message: "The whole lodash library is imported for one function. That adds about 70 KB to the bundle.",
    fix: "Import only the function you use.",
    autoFixable: true,
    patch: "--- a/src/utils/date.ts\n+++ b/src/utils/date.ts\n@@ -1,1 +1,1 @@\n-import _ from \"lodash\";\n+import debounce from \"lodash/debounce\";\n",
  },
  {
    kind: "mummy", severity: "low", rule: "docs/readme-wrong-script",
    title: "README says npm start, there is no start script", file: "README.md", line: 23,
    message: "The setup steps tell people to run npm start. package.json has only dev and build.",
    fix: "Change the README to npm run dev, or add a start script.",
    autoFixable: true,
    patch: "--- a/README.md\n+++ b/README.md\n@@ -23,1 +23,1 @@\n-npm start\n+npm run dev\n",
  },
  {
    kind: "bat", severity: "low", rule: "perf/listener-leak",
    title: "Listener never removed", file: "src/hooks/useScroll.ts", line: 9,
    message: "A scroll listener is added in an effect but never removed. Each mount adds one more.",
    fix: "Return a cleanup function that calls removeEventListener.",
    autoFixable: true,
    patch: "--- a/src/hooks/useScroll.ts\n+++ b/src/hooks/useScroll.ts\n@@ -9,2 +9,3 @@\n   window.addEventListener(\"scroll\", onScroll);\n-  }, []);\n+    return () => window.removeEventListener(\"scroll\", onScroll);\n+  }, []);\n",
  },
  {
    kind: "zombie", severity: "low", rule: "lint/eqeqeq",
    title: "Loose equality", file: "src/auth.ts", line: 51,
    message: "`==` compares with type coercion. `\"0\" == 0` is true.",
    fix: "Use `===`.",
    autoFixable: true,
    patch: "--- a/src/auth.ts\n+++ b/src/auth.ts\n@@ -51,1 +51,1 @@\n-  if (user.role == \"admin\") {\n+  if (user.role === \"admin\") {\n",
  },
  {
    kind: "ghost", severity: "low", rule: "secret/generic-secret", cwe: "CWE-798", owasp: "A07:2021",
    title: "Test JWT secret", file: "test/setup.ts", line: 4, commit: "3d77a1b", introducedAt: "2026-06-01T12:00:00Z",
    message: "A JWT secret is hard-coded in the test setup. It looks like a test value.",
    fix: "Load it from an environment variable, even in tests.",
    blastRadius: blastRadiusFor("secret/generic-secret"),
    autoFixable: false, masked: "••••••••••••st42",
    ghost: {
      firstSeen: { commit: "3d77a1b", date: "2026-06-01T12:00:00Z", file: "test/setup.ts", line: 4 },
      copies: [], commitCount: 9, deletedAtHead: false,
    },
  },
];

const findings: Finding[] = sortFindings(
  raw.map((f) => ({ ...f, id: stableId(f.kind, [f.rule, f.file, f.line, f.commit]) })),
);

export const DEMO_RESULT: ScanResult = {
  repo: "rene/spooky-shop",
  defaultBranch: "main",
  commitsScanned: 300,
  filesScanned: 142,
  durationMs: 9400,
  partial: false,
  notes: ["Demo repo: prepared scan with every creature kind. Masked values are invented."],
  findings,
  score: score(findings),
};
