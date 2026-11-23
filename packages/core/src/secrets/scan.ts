import { sha256Hex } from "../sha256";
import type { Finding, Severity } from "../types";
import { shannonEntropy } from "./entropy";
import { mask } from "./mask";
import { SECRET_RULES, isPlaceholder, looksLikeSample, type SecretRule } from "./rules";
import { blastRadiusFor } from "./blast-radius";
import { stableId } from "../id";

export const ENTROPY_MIN = 4.0;
export const ENTROPY_MIN_LENGTH = 20;
const MAX_LINE_LENGTH = 2000;

const ENTROPY_RULE: SecretRule = {
  id: "secret/high-entropy",
  title: "Suspicious random string",
  pattern: /(?:key|secret|token|password|passwd|pwd)[A-Za-z0-9_]*["']?\s*[:=]\s*["'`]([^"'`\s]{20,})["'`]/i,
  severity: "warning",
  keepPrefix: 0,
  message: "A long random value is assigned to a key, secret, token or password variable.",
  fix: "If this is a real credential, rotate it and load it from an environment variable.",
};

export interface SecretHit {
  rule: SecretRule;
  /** Hash of the raw value. The raw value itself never leaves this module. */
  hash: string;
  preview: string;
  severity: Severity;
  file: string;
  line: number;
  commit: string;
  date: string | null;
  /** Ciphertext from ctx.seal, never the raw value. */
  sealed?: string;
}

export interface LineContext {
  file: string;
  commit: string;
  date: string | null;
  /**
   * Optional sealing hook (server only): turns a raw value of an allowed rule into ciphertext,
   * e.g. so a GitHub token can be revoked later without the raw value ever leaving the server.
   */
  seal?: (ruleId: string, value: string) => string | undefined;
}

function hashValue(v: string): string {
  return sha256Hex(v);
}

/** Scans one line. Never throws. */
export function scanLine(text: string, line: number, ctx: LineContext): SecretHit[] {
  if (!text || text.length > MAX_LINE_LENGTH) return [];
  const hits: SecretHit[] = [];
  const seen = new Set<string>();

  const record = (rule: SecretRule, value: string) => {
    const hash = hashValue(value);
    if (seen.has(hash)) return;
    seen.add(hash);
    hits.push({
      rule,
      hash,
      preview: mask(value, rule.keepPrefix),
      severity: looksLikeSample(value.slice(rule.keepPrefix)) ? "low" : rule.severity,
      file: ctx.file,
      line,
      commit: ctx.commit,
      date: ctx.date,
      sealed: ctx.seal?.(rule.id, value),
    });
  };

  for (const rule of SECRET_RULES) {
    const m = rule.pattern.exec(text);
    const value = m?.[1];
    if (!value) continue;
    if (rule.id === "secret/generic-secret" && isPlaceholder(value)) continue;
    record(rule, value);
  }

  if (hits.length === 0) {
    const m = ENTROPY_RULE.pattern.exec(text);
    const value = m?.[1];
    if (
      value &&
      value.length >= ENTROPY_MIN_LENGTH &&
      !isPlaceholder(value) &&
      shannonEntropy(value) >= ENTROPY_MIN
    ) {
      record(ENTROPY_RULE, value);
    }
  }
  return hits;
}

/** Scans plain file content (all lines). */
export function scanText(content: string, ctx: LineContext): SecretHit[] {
  const out: SecretHit[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) out.push(...scanLine(lines[i]!, i + 1, ctx));
  return out;
}

/** Scans only added lines of a unified diff patch, tracking new-file line numbers. */
export function scanPatch(patch: string, ctx: LineContext): SecretHit[] {
  const out: SecretHit[] = [];
  let newLine = 0;
  for (const raw of patch.split(/\r?\n/)) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith("+++") || raw.startsWith("---")) continue;
    if (raw.startsWith("+")) {
      out.push(...scanLine(raw.slice(1), newLine, ctx));
      newLine++;
    } else if (raw.startsWith("-")) {
      // removed line: does not advance new-file counter
    } else {
      newLine++;
    }
  }
  return out;
}

/**
 * Merges hits of the same secret into one ghost finding.
 * Hits must be ordered newest commit first (GitHub API order); the oldest becomes firstSeen.
 */
/** Commit label for hits found in the current files. */
export const HEAD = "HEAD";

/**
 * `hits` come from history (newest commit first). `headHits` come from current files;
 * when given, ghosts missing from HEAD are marked "deleted, still in history".
 */
export function collectGhosts(hits: SecretHit[], headHits?: SecretHit[]): Finding[] {
  const groups = new Map<string, SecretHit[]>();
  for (const h of hits) {
    const g = groups.get(h.hash);
    if (g) g.push(h);
    else groups.set(h.hash, [h]);
  }
  const atHead = new Map<string, SecretHit>();
  for (const h of headHits ?? []) {
    if (!atHead.has(h.hash)) atHead.set(h.hash, h);
    if (!groups.has(h.hash)) groups.set(h.hash, [h]);
  }

  const findings: Finding[] = [];
  for (const [hash, group] of groups) {
    const first = group[group.length - 1]!;
    const commits = new Set(group.filter((h) => h.commit !== HEAD).map((h) => h.commit));
    const copies = group
      .slice(0, -1)
      .reverse()
      .filter((h) => h.commit !== first.commit || h.file !== first.file)
      .map((h) => ({ commit: h.commit, file: h.file, date: h.date }));
    const head = atHead.get(hash);
    if (head && head.file !== first.file && !copies.some((c) => c.file === head.file)) {
      copies.push({ commit: HEAD, file: head.file, date: null });
    }
    const deletedAtHead = headHits ? !head : undefined;
    const message = deletedAtHead
      ? `${first.rule.message} The file no longer has it, but it is still in history.`
      : first.rule.message;
    findings.push({
      id: stableId("ghost", [first.rule.id, hash]),
      kind: "ghost",
      severity: first.severity,
      rule: first.rule.id,
      cwe: "CWE-798",
      owasp: "A07:2021",
      title: first.rule.title,
      file: first.file,
      line: first.line,
      commit: first.commit === HEAD ? undefined : first.commit,
      introducedAt: first.date ?? undefined,
      message,
      fix: first.rule.fix,
      blastRadius: blastRadiusFor(first.rule.id),
      autoFixable: false,
      masked: first.preview,
      revokeHandle: group.find((h) => h.sealed)?.sealed ?? atHead.get(hash)?.sealed,
      evidence: copies.map((c) => `${c.file}@${c.commit}`),
      ghost: {
        firstSeen: { commit: first.commit, date: first.date, file: first.file, line: first.line },
        copies,
        commitCount: Math.max(commits.size, 1),
        deletedAtHead,
      },
    });
  }
  return findings;
}
