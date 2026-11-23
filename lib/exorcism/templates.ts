import type { Finding } from "@/lib/types";

export interface RitualTemplate {
  provider: string;
  rotate: string;
  envVar: string;
  snippet: string;
}

export type StepId = "rotate" | "env" | "history" | "guard";

export interface RitualStep {
  id: StepId;
  title: string;
  body: string;
  command?: string;
}

const T = {
  stripe: {
    provider: "Stripe",
    rotate: "Dashboard → Developers → API keys → Roll key. The old key stops working right away.",
    envVar: "STRIPE_SECRET_KEY",
    snippet: "const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);",
  },
  aws: {
    provider: "AWS",
    rotate: "IAM → Users → Security credentials → Deactivate the old access key, then create a new one.",
    envVar: "AWS_ACCESS_KEY_ID",
    snippet: "// The AWS SDK reads AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY itself.\nconst s3 = new S3Client({});",
  },
  github: {
    provider: "GitHub",
    rotate: "Settings → Developer settings → Personal access tokens → Delete it, then create a fine-grained token.",
    envVar: "GITHUB_TOKEN",
    snippet: "const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });",
  },
  slack: {
    provider: "Slack",
    rotate: "api.slack.com/apps → your app → OAuth & Permissions → Revoke tokens, then reinstall the app.",
    envVar: "SLACK_BOT_TOKEN",
    snippet: "const slack = new WebClient(process.env.SLACK_BOT_TOKEN);",
  },
  google: {
    provider: "Google Cloud",
    rotate: "APIs & Services → Credentials → Regenerate key, then restrict it to the APIs and sites you use.",
    envVar: "GOOGLE_API_KEY",
    snippet: "const key = process.env.GOOGLE_API_KEY;",
  },
  ai: {
    provider: "your AI provider",
    rotate: "Provider console → API keys → Revoke the old key, then create a new one.",
    envVar: "AI_API_KEY",
    snippet: "const client = new Client({ apiKey: process.env.AI_API_KEY });",
  },
  privateKey: {
    provider: "your servers",
    rotate: "Create a new key pair (ssh-keygen -t ed25519) and replace the public key everywhere it is trusted.",
    envVar: "PRIVATE_KEY",
    snippet: "const privateKey = process.env.PRIVATE_KEY;",
  },
  generic: {
    provider: "the service that issued it",
    rotate: "Find where this value came from, revoke it there and issue a new one.",
    envVar: "APP_SECRET",
    snippet: "const secret = process.env.APP_SECRET;",
  },
} satisfies Record<string, RitualTemplate>;

export const TEMPLATE_BY_RULE: Record<string, RitualTemplate> = {
  "secret/stripe-live-key": T.stripe,
  "secret/stripe-test-key": T.stripe,
  "secret/aws-access-key": T.aws,
  "secret/aws-secret-key": T.aws,
  "secret/github-token": T.github,
  "secret/slack-token": T.slack,
  "secret/google-api-key": T.google,
  "secret/openai-style-key": T.ai,
  "secret/private-key": T.privateKey,
  "secret/generic-secret": T.generic,
  "secret/high-entropy": T.generic,
};

export function templateFor(rule: string): RitualTemplate {
  return TEMPLATE_BY_RULE[rule] ?? T.generic;
}

/**
 * Builds the 4 ritual steps for one ghost. Pure.
 * Uses only rule, counts and names: the raw secret is never available here,
 * and the masked preview is not repeated in commands (security.md rule 1).
 */
export function buildRitual(f: Finding): RitualStep[] {
  const t = templateFor(f.rule);
  const commits = f.ghost?.commitCount ?? 1;
  return [
    {
      id: "rotate",
      title: `Roll the key in ${t.provider}`,
      body: t.rotate,
    },
    {
      id: "env",
      title: "Move the new key to an env variable",
      body: `Add ${t.envVar} in Vercel (or your host) and read it with process.env. Never commit it.`,
      command: t.snippet,
    },
    {
      id: "history",
      title: "Rewrite history",
      body: `Remove every trace from all ${commits} commit${commits === 1 ? "" : "s"}, then force-push and ask collaborators to re-clone.`,
      command: [
        "# put the OLD key into secrets.txt yourself, never commit this file",
        "echo 'PASTE_OLD_KEY_HERE==>REMOVED' > secrets.txt",
        "git filter-repo --replace-text secrets.txt",
        "rm secrets.txt",
        "git remote add origin <your-repo-url>   # filter-repo removes it",
        "git push --force --all",
      ].join("\n"),
    },
    {
      id: "guard",
      title: "Keep it from coming back",
      body: "Enable the Haunted Repo pre-commit hook so a new key never reaches a commit.",
      command: "npx haunted-repo install-hooks",
    },
  ];
}
