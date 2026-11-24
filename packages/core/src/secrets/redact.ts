import { SECRET_RULES, isPlaceholder } from "./rules";

const MAX = 2000;

/**
 * Replaces every secret value in one line of text with <REDACTED> (security.md rule 1).
 * Used for sandbox output and any other free text that leaves the server. Never throws.
 */
export function redactLine(text: string): string {
  if (!text) return text;
  let out = text.length > MAX ? text.slice(0, MAX) : text;
  for (const rule of SECRET_RULES) {
    const flags = rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`;
    const re = new RegExp(rule.pattern.source, flags);
    out = out.replace(re, (whole: string, value?: string) => {
      if (!value || (rule.id === "secret/generic-secret" && isPlaceholder(value))) return whole;
      return whole.split(value).join("<REDACTED>");
    });
  }
  return out;
}
