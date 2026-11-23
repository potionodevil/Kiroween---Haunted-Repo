/**
 * Fake secrets for tests. Assembled at runtime so no literal key exists in the repo
 * (see .kiro/steering/security.md rule 7). None of these belong to any account.
 */
const j = (...parts: string[]) => parts.join("");

export const FAKE = {
  awsAccess: j("AK", "IA", "Q3ZP7RW2LX9MNB4T"),
  awsSecret: j("wJalr", "XUtnFEMI/K7MDENG/bPxRfiCY", "Q9vT2mLpZx"),
  stripeLive: j("sk", "_live_", "51Hq7Lm2Zx9Pw4Rt8Vb3Nc6Kd"),
  stripeTest: j("sk", "_test_", "51Hq7Lm2Zx9Pw4Rt8Vb3Nc6Kd"),
  github: j("gh", "p_", "R7tYq2Wm9Lx4Pz8Vn3Bc6Kd1Hf5Js0Ga2Te9"),
  slack: j("xo", "xb-", "1234567890-0987654321-Qw7Er9Ty2Ui4"),
  google: j("AI", "za", "Sy9Qw7Er2Ty4Ui6Op8As0Df3Gh5Jk7Lz1X4"),
  ai: j("sk", "-proj-", "Q7w9E2r4T6y8U0i3O5p7A9s1D3f5G7h9"),
  privateKeyHeader: j("-----BEGIN ", "RSA PRIVATE", " KEY-----"),
  randomToken: j("q7W9e2R4t6Y8u0I3", "o5P7a9S1d3F5g7H9"),
} as const;
