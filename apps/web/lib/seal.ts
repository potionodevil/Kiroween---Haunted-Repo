import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM sealing for revocable secrets (feature 12).
 * The browser only ever sees ciphertext; only this server can open it, and only to send it to GitHub's revoke endpoint.
 * Key: HAUNTED_SEAL_KEY, else derived from GITHUB_TOKEN, else a per-process random key (handles die on restart).
 */
const RANDOM = randomBytes(32);
const SEALABLE = new Set(["secret/github-token"]);

function key(): Buffer {
  const material = process.env.HAUNTED_SEAL_KEY ?? process.env.GITHUB_TOKEN;
  return material ? createHash("sha256").update(`haunted-seal:${material}`).digest() : RANDOM;
}

export function seal(ruleId: string, value: string): string | undefined {
  if (!SEALABLE.has(ruleId)) return undefined;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(value, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

export function unseal(handle: string): string | null {
  try {
    const buf = Buffer.from(handle, "base64url");
    if (buf.length < 29 || buf.length > 512) return null;
    const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
