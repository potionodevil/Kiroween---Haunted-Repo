import { CREATURE_KINDS, type Finding } from "./types";
import { MASK_CHAR } from "./secrets/mask";

const SEVERITIES = new Set(["critical", "warning", "low"]);
const KINDS = new Set<string>(CREATURE_KINDS);
const ID = /^[a-z]_[0-9a-f]{12}$/;

/** Shape check used by tests and by consumers that receive findings from outside. */
export function isValidFinding(f: unknown): f is Finding {
  if (typeof f !== "object" || f === null) return false;
  const x = f as Record<string, unknown>;
  if (typeof x.id !== "string" || !ID.test(x.id)) return false;
  if (typeof x.kind !== "string" || !KINDS.has(x.kind)) return false;
  if (typeof x.severity !== "string" || !SEVERITIES.has(x.severity)) return false;
  for (const k of ["rule", "title", "file", "message", "fix"]) {
    if (typeof x[k] !== "string" || (x[k] as string).length === 0) return false;
  }
  if (typeof x.autoFixable !== "boolean") return false;
  if (x.line !== undefined && (typeof x.line !== "number" || !Number.isInteger(x.line) || x.line < 0)) return false;
  if (x.kind === "skeleton" && x.confidence === undefined) return false;
  if (x.masked !== undefined) {
    if (typeof x.masked !== "string") return false;
    // at most 4 characters after the last mask bullet
    const tail = x.masked.split(MASK_CHAR).pop() ?? "";
    if (x.masked.includes(MASK_CHAR) && Array.from(tail).length > 4) return false;
  }
  return true;
}
