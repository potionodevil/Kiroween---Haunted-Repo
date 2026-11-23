import type { CreatureKind } from "./types";
import { sha256Hex } from "./sha256";

const PREFIX: Record<CreatureKind, string> = {
  ghost: "g",
  vampire: "v",
  spider: "s",
  poltergeist: "p",
  zombie: "z",
  bat: "b",
  skeleton: "k",
  mummy: "m",
  possessed: "x",
  banshee: "n",
};

/**
 * Stable finding id: "<letter>_<12 hex>".
 * Parts per kind (scanner-core design):
 *   ghost:   rule, sha256(secret value)
 *   vampire: osv id, package, installed version
 *   others:  rule, file, line, commit
 */
export function stableId(kind: CreatureKind, parts: (string | number | undefined | null)[]): string {
  const key = [kind, ...parts.map((p) => (p === undefined || p === null ? "" : String(p)))].join("\u0000");
  return `${PREFIX[kind]}_${sha256Hex(key).slice(0, 12)}`;
}
