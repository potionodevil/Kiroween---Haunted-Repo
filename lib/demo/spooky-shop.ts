import type { Finding, ScanResult } from "@/lib/types";
import { score } from "@/lib/scanner/score";

/** Fake scan of a made-up repo, used for the demo button and offline UI work. No real keys. */
const findings: Finding[] = [
  {
    id: "g_5a1c09e7b2", kind: "ghost", severity: "critical", rule: "secret/stripe-live-key",
    title: "Stripe live key", file: "config/payments.js", line: 12, commit: "a3f91c2",
    message: "A live Stripe secret key was committed on 14 Mar 2026. The file is deleted, but the key is still in history.",
    fix: "Roll the key in the Stripe dashboard, move it to an environment variable, then rewrite history with git filter-repo.",
    autoFixable: false, patch: null, secretPreview: "sk_live_••••••••••••4f2a",
    ghost: {
      firstSeen: { commit: "a3f91c2", date: "2026-03-14T10:21:00Z", file: "config/payments.js", line: 12 },
      copies: [{ commit: "9c1d8e4", file: "README.md" }],
      commitCount: 47,
    },
  },
  {
    id: "g_7be20d4c11", kind: "ghost", severity: "critical", rule: "secret/aws-access-key",
    title: "AWS access key", file: ".env.production", line: 3, commit: "7be20d4",
    message: "An AWS access key id was committed in .env.production. Paired with its secret it opens your AWS account.",
    fix: "Deactivate the key in IAM, create a new one, store it in an environment variable, then rewrite history.",
    autoFixable: false, patch: null, secretPreview: "AKIA••••••••••••Q7XM",
    ghost: {
      firstSeen: { commit: "7be20d4", date: "2026-02-02T08:05:00Z", file: ".env.production", line: 3 },
      copies: [], commitCount: 112,
    },
  },
  {
    id: "z_1", kind: "zombie", severity: "critical", rule: "lint/unhandled-promise",
    title: "Unhandled promise", file: "src/checkout.ts", line: 88, commit: null,
    message: "Payment confirmation is awaited nowhere. A failed request silently loses the order.",
    fix: "Add await and a try/catch that shows the user an error and logs the failure.",
    autoFixable: true,
    patch: "--- a/src/checkout.ts\n+++ b/src/checkout.ts\n@@ -88,1 +88,6 @@\n-  confirmPayment(order);\n+  try {\n+    await confirmPayment(order);\n+  } catch (err) {\n+    showError(\"Payment failed. Please try again.\");\n+    console.error(err);\n+  }\n",
  },
  {
    id: "b_1", kind: "bat", severity: "warning", rule: "perf/query-in-loop",
    title: "N+1 query in loop", file: "src/orders.ts", line: 42, commit: null,
    message: "A database query runs once per order inside a loop. 100 orders mean 100 round trips.",
    fix: "Load all items in one query with an IN clause, then group them in memory.",
    autoFixable: false, patch: null,
  },
  {
    id: "g_c41e8a0f93", kind: "ghost", severity: "warning", rule: "secret/github-token",
    title: "GitHub token", file: "scripts/deploy.sh", line: 7, commit: "c41e8a0",
    message: "A GitHub token was committed in a deploy script. Its scope is unknown.",
    fix: "Revoke the token in GitHub settings, create a new one with the smallest scope, store it as a secret.",
    autoFixable: false, patch: null, secretPreview: "ghp_••••••••••••9KdQ",
    ghost: {
      firstSeen: { commit: "c41e8a0", date: "2026-05-19T16:40:00Z", file: "scripts/deploy.sh", line: 7 },
      copies: [], commitCount: 21,
    },
  },
  {
    id: "z_2", kind: "zombie", severity: "warning", rule: "lint/no-unused-vars",
    title: "Unused variable", file: "src/cart.ts", line: 17, commit: null,
    message: "`discount` is assigned but never used. The discount is probably not applied.",
    fix: "Use the variable or remove it.",
    autoFixable: true,
    patch: "--- a/src/cart.ts\n+++ b/src/cart.ts\n@@ -17,1 +17,0 @@\n-  const discount = getDiscount(user);\n",
  },
  {
    id: "b_2", kind: "bat", severity: "warning", rule: "perf/full-library-import",
    title: "Heavy bundle import", file: "src/utils/date.ts", line: 1, commit: null,
    message: "The whole lodash library is imported for one function. That adds about 70 KB to the bundle.",
    fix: "Import only the function you use.",
    autoFixable: true,
    patch: "--- a/src/utils/date.ts\n+++ b/src/utils/date.ts\n@@ -1,1 +1,1 @@\n-import _ from \"lodash\";\n+import debounce from \"lodash/debounce\";\n",
  },
  {
    id: "b_3", kind: "bat", severity: "low", rule: "perf/listener-leak",
    title: "Listener never removed", file: "src/hooks/useScroll.ts", line: 9, commit: null,
    message: "A scroll listener is added in an effect but never removed. Each mount adds one more.",
    fix: "Return a cleanup function that calls removeEventListener.",
    autoFixable: true,
    patch: "--- a/src/hooks/useScroll.ts\n+++ b/src/hooks/useScroll.ts\n@@ -9,2 +9,3 @@\n   window.addEventListener(\"scroll\", onScroll);\n-  }, []);\n+    return () => window.removeEventListener(\"scroll\", onScroll);\n+  }, []);\n",
  },
  {
    id: "z_3", kind: "zombie", severity: "low", rule: "lint/eqeqeq",
    title: "Loose equality", file: "src/auth.ts", line: 51, commit: null,
    message: "`==` compares with type coercion. `\"0\" == 0` is true.",
    fix: "Use `===`.",
    autoFixable: true,
    patch: "--- a/src/auth.ts\n+++ b/src/auth.ts\n@@ -51,1 +51,1 @@\n-  if (user.role == \"admin\") {\n+  if (user.role === \"admin\") {\n",
  },
  {
    id: "g_9f02b6d1aa", kind: "ghost", severity: "low", rule: "secret/generic-secret",
    title: "Test JWT secret", file: "test/setup.ts", line: 4, commit: "3d77a1b",
    message: "A JWT secret is hard-coded in the test setup. It looks like a test value.",
    fix: "Load it from an environment variable, even in tests.",
    autoFixable: false, patch: null, secretPreview: "••••••••••••st42",
    ghost: {
      firstSeen: { commit: "3d77a1b", date: "2026-06-01T12:00:00Z", file: "test/setup.ts", line: 4 },
      copies: [], commitCount: 9,
    },
  },
];

export const DEMO_RESULT: ScanResult = {
  repo: "rene/spooky-shop",
  defaultBranch: "main",
  commitsScanned: 300,
  filesScanned: 142,
  durationMs: 9400,
  partial: false,
  findings,
  score: score(findings),
};
