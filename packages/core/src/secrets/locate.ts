import { SECRET_RULES, isPlaceholder } from "./rules";
import { templateFor } from "../exorcism/templates";

/**
 * LOCAL ONLY. Returns raw secret positions so the watcher CLI (feature 15) can move a value from a file
 * into .env.local on the same machine. Never send the result anywhere: no network, no logs (security.md rules 1 and 9).
 */
export interface LocatedSecret {
  rule: string;
  start: number;
  end: number;
  value: string;
  /** Suggested env variable name, e.g. STRIPE_SECRET_KEY. */
  envVar: string;
  /** True when the value sits inside matching quotes, so the quotes can be replaced too. */
  quoted: boolean;
  quote: string;
}

const LOCATABLE = new Set([
  "secret/aws-access-key",
  "secret/aws-secret-key",
  "secret/stripe-live-key",
  "secret/stripe-test-key",
  "secret/github-token",
  "secret/slack-token",
  "secret/google-api-key",
  "secret/openai-style-key",
  "secret/generic-secret",
]);

export function locateSecrets(text: string): LocatedSecret[] {
  const out: LocatedSecret[] = [];
  const taken: [number, number][] = [];
  for (const rule of SECRET_RULES) {
    if (!LOCATABLE.has(rule.id)) continue;
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
    for (const m of text.matchAll(re)) {
      const value = m[1];
      if (!value || m.index === undefined) continue;
      if (rule.id === "secret/generic-secret" && isPlaceholder(value)) continue;
      const start = m.index + m[0].lastIndexOf(value);
      const end = start + value.length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      taken.push([start, end]);
      const before = text[start - 1] ?? "";
      const after = text[end] ?? "";
      const quoted = (before === '"' || before === "'" || before === "`") && after === before;
      out.push({ rule: rule.id, start, end, value, envVar: templateFor(rule.id).envVar, quoted, quote: quoted ? before : "" });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** How each file type reads an environment variable. Undefined = this file type is left alone. */
export function envLookup(path: string, name: string, quoted: boolean): string | undefined {
  if (/\.(env|env\.[a-z]+)$|(^|\/)\.env[^/]*$/i.test(path)) return undefined;
  if (/\.(m?[jt]sx?|cjs|mts|cts)$/i.test(path)) return quoted ? `process.env.${name}` : `\${process.env.${name}}`;
  if (/\.py$/i.test(path)) return quoted ? `os.environ["${name}"]` : undefined;
  if (/\.(ya?ml|toml|json|ini|cfg|conf|properties|tf|sh|bash|zsh|dockerfile)$|(^|\/)Dockerfile$/i.test(path)) return `\${${name}}`;
  return undefined;
}
