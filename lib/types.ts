export type CreatureKind = "ghost" | "zombie" | "bat";
export type Severity = "critical" | "warning" | "low";

export interface Finding {
  /** "g_<hash10>" for ghosts (stable across rescans), "z_/b_<n>" otherwise. */
  id: string;
  kind: CreatureKind;
  severity: Severity;
  /** Rule id, e.g. "secret/aws-access-key". */
  rule: string;
  title: string;
  file: string;
  line: number;
  /** 7-char sha, null for HEAD-only findings. */
  commit: string | null;
  message: string;
  fix: string;
  autoFixable: boolean;
  /** Unified diff, only when autoFixable. */
  patch: string | null;
  /** Masked secret, at most 4 real body characters. Ghosts only. */
  secretPreview?: string;
  ghost?: GhostTrail;
}

export interface GhostTrail {
  firstSeen: { commit: string; date: string | null; file: string; line: number };
  copies: { commit: string; file: string }[];
  commitCount: number;
}

export interface ScanResult {
  repo: string;
  defaultBranch: string;
  commitsScanned: number;
  filesScanned: number;
  durationMs: number;
  partial: boolean;
  findings: Finding[];
  score: number;
}
