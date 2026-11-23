import type { Severity } from "@/lib/types";

export interface SecretRule {
  id: string;
  title: string;
  /** Must contain exactly one capture group: the secret value. No `g` flag. */
  pattern: RegExp;
  severity: Severity;
  /** Visible type prefix length in the masked preview, e.g. 4 for "AKIA". */
  keepPrefix: number;
  message: string;
  fix: string;
}

export const SECRET_RULES: SecretRule[] = [
  {
    id: "secret/aws-access-key",
    title: "AWS access key",
    pattern: /\b((?:AKIA|ASIA)[0-9A-Z]{16})\b/,
    severity: "critical",
    keepPrefix: 4,
    message: "An AWS access key id was committed. Paired with its secret it opens your AWS account.",
    fix: "Deactivate the key in IAM, create a new one, store it in an environment variable, then rewrite history.",
  },
  {
    id: "secret/aws-secret-key",
    title: "AWS secret key",
    pattern: /aws_?secret_?(?:access_?)?key["']?\s*[:=]\s*["']?([A-Za-z0-9/+]{40})(?![A-Za-z0-9/+])/i,
    severity: "critical",
    keepPrefix: 0,
    message: "An AWS secret access key was committed. Anyone with it can act as that IAM user.",
    fix: "Deactivate the key pair in IAM, create a new one, store it in an environment variable, then rewrite history.",
  },
  {
    id: "secret/stripe-live-key",
    title: "Stripe live key",
    pattern: /\b((?:sk|rk)_live_[0-9a-zA-Z]{16,})\b/,
    severity: "critical",
    keepPrefix: 8,
    message: "A live Stripe secret key was committed. It can create charges and refunds on your account.",
    fix: "Roll the key in the Stripe dashboard, move it to an environment variable, then rewrite history with git filter-repo.",
  },
  {
    id: "secret/stripe-test-key",
    title: "Stripe test key",
    pattern: /\b((?:sk|rk)_test_[0-9a-zA-Z]{16,})\b/,
    severity: "warning",
    keepPrefix: 8,
    message: "A Stripe test key was committed. It cannot move real money but exposes your test data.",
    fix: "Roll the test key in the Stripe dashboard and load it from an environment variable.",
  },
  {
    id: "secret/github-token",
    title: "GitHub token",
    pattern: /\b((?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,})\b/,
    severity: "critical",
    keepPrefix: 4,
    message: "A GitHub token was committed. It can read or write repos with its owner's rights.",
    fix: "Revoke the token in GitHub settings, create a new one with the smallest scope, store it as a secret.",
  },
  {
    id: "secret/slack-token",
    title: "Slack token",
    pattern: /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/,
    severity: "warning",
    keepPrefix: 5,
    message: "A Slack token was committed. It can read or post messages in your workspace.",
    fix: "Revoke the token in the Slack app settings and reinstall the app to get a new one.",
  },
  {
    id: "secret/google-api-key",
    title: "Google API key",
    pattern: /\b(AIza[0-9A-Za-z_-]{35})(?![0-9A-Za-z_-])/,
    severity: "warning",
    keepPrefix: 4,
    message: "A Google API key was committed. Unrestricted keys can run up your Google Cloud bill.",
    fix: "Regenerate the key in Google Cloud Console and restrict it by API and referrer.",
  },
  {
    id: "secret/openai-style-key",
    title: "AI API key",
    pattern: /\b(sk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,})(?![A-Za-z0-9_-])/,
    severity: "warning",
    keepPrefix: 3,
    message: "An AI provider API key was committed. Others can spend your credits with it.",
    fix: "Revoke the key in the provider console, create a new one, load it from an environment variable.",
  },
  {
    id: "secret/private-key",
    title: "Private key",
    pattern: /(-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----)/,
    severity: "critical",
    keepPrefix: 0,
    message: "A private key block was committed. Whoever holds it can impersonate the server or user.",
    fix: "Generate a new key pair, replace the public key everywhere it is trusted, then rewrite history.",
  },
  {
    id: "secret/generic-secret",
    title: "Hard-coded secret",
    pattern:
      /\b[A-Z0-9_]*(?:SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|PRIVATE_KEY|AUTH_TOKEN|ACCESS_TOKEN)[A-Z0-9_]*["']?\s*[:=]\s*["']?([^\s"'`#,;]{8,})/,
    severity: "warning",
    keepPrefix: 0,
    message: "A value that looks like a secret is assigned in code or config.",
    fix: "Move the value to an environment variable and rotate it if it was ever real.",
  },
];

/** Values that are references or placeholders, not secrets. */
export function isPlaceholder(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.startsWith("process.env") ||
    v.startsWith("import.meta.env") ||
    v.startsWith("os.environ") ||
    v.startsWith("$") ||
    v.startsWith("<") ||
    v.startsWith("{") ||
    v.startsWith("your") ||
    v.includes("(") ||
    v.includes("xxxx") ||
    v.includes("****") ||
    v.includes("•") ||
    /^(true|false|null|undefined|none|changeme|password|secret)$/.test(v)
  );
}

/** "test", "example", "dummy", "fake" in the value lowers severity to low. */
export function looksLikeSample(value: string): boolean {
  return /test|example|dummy|fake|sample/i.test(value);
}
