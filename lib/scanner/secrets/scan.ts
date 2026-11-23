import { createHash } from "node:crypto";
import type { Finding, Severity } from "@/lib/types";
import { shannonEntropy } from "./entropy";
import { mask } from "./mask";
import { SECRET_RULES, isPlaceholder, looksLikeSample, type SecretRule } from "./rules";

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
}

export interface LineContext {
  file: string;
  commit: string;
  date: string | null;
}

function hashValue(v: string): string {
  return createHash("sha256").update(v).digest("hex");
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
export function collectGhosts(hits: SecretHit[]): Finding[] {
  const groups = new Map<string, SecretHit[]>();
  for (const h of hits) {
    const g = groups.get(h.hash);
    if (g) g.push(h);
    else groups.set(h.hash, [h]);
  }
  const findings: Finding[] = [];
  for (const [hash, group] of groups) {
    const first = group[group.length - 1]!;
    const commits = new Set(group.map((h) => h.commit));
    const copies = group
      .slice(0, -1)
      .reverse()
      .filter((h) => h.commit !== first.commit || h.file !== first.file)
      .map((h) => ({ commit: h.commit, file: h.file }));
    findings.push({
      id: `g_${hash.slice(0, 10)}`,
      kind: "ghost",
      severity: first.severity,
      rule: first.rule.id,
      title: first.rule.title,
      file: first.file,
      line: first.line,
      commit: first.commit,
      message: first.rule.message,
      fix: first.rule.fix,
      autoFixable: false,
      patch: null,
      secretPreview: first.preview,
      ghost: {
        firstSeen: { commit: first.commit, date: first.date, file: first.file, line: first.line },
        copies,
        commitCount: commits.size,
      },
    });
  }
  return findings;
}
