export const CREATURE_KINDS = [
  "ghost",
  "vampire",
  "spider",
  "poltergeist",
  "zombie",
  "bat",
  "skeleton",
  "mummy",
  "possessed",
  "banshee",
] as const;

export type CreatureKind = (typeof CREATURE_KINDS)[number];
export type Severity = "critical" | "warning" | "low";
export type Confidence = "high" | "medium" | "low";

export interface Finding {
  /** Stable across rescans of the same repo state. See stableId(). */
  id: string;
  kind: CreatureKind;
  severity: Severity;
  /** "secret/aws-access-key", "osv/GHSA-xxxx", "spider/sql-concat" */
  rule: string;
  /** "CWE-798" */
  cwe?: string;
  /** "A07:2021" */
  owasp?: string;
  title: string;
  file: string;
  line?: number;
  /** 7-char sha of the commit that introduced it, when known. */
  commit?: string;
  /** ISO date of the introducing commit. */
  introducedAt?: string;
  /** ISO date of the commit that removed it, if any. */
  fixedAt?: string;
  /** What is wrong, one or two plain sentences. */
  message: string;
  /** What to do, one or two plain sentences. */
  fix: string;
  /** Ghosts: what this key type can do if abused. */
  blastRadius?: string;
  autoFixable: boolean;
  /** Unified diff. */
  patch?: string;
  references?: string[];
  /** Ghosts: type prefix + at most 4 real characters. Never the raw value. */
  masked?: string;
  /** Vampires: direct dependency → … → vulnerable package. */
  dependencyPath?: string[];
  /** Vampires: smallest version that fixes it. */
  minimalUpgrade?: string;
  /** Path of the generated test that reproduces the finding. */
  proofTest?: string;
  /** Required for skeleton findings. */
  confidence?: Confidence;
  /** Files and lines that support the finding, e.g. "README.md@9c1d8e4". */
  evidence?: string[];
  /** Ghost-only details for the ritual timeline. */
  ghost?: GhostTrail;
}

export interface GhostTrail {
  firstSeen: { commit: string; date: string | null; file: string; line: number };
  copies: { commit: string; file: string }[];
  /** Commits still containing the secret. */
  commitCount: number;
  /** True when the secret is gone from HEAD but lives on in history. */
  deletedAtHead?: boolean;
}

export interface ScanResult {
  repo: string;
  defaultBranch: string;
  commitsScanned: number;
  filesScanned: number;
  durationMs: number;
  partial: boolean;
  /** Plain notes about skipped or partial work. */
  notes: string[];
  findings: Finding[];
  score: number;
}
