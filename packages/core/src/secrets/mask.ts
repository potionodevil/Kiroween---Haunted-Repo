export const MASK_CHAR = "•";
const MAX_BULLETS = 16;

/**
 * Masks a secret. Keeps up to `keepPrefix` type-prefix chars (e.g. "AKIA"),
 * then bullets, then the last 4 body chars. Bodies shorter than 12 chars
 * show no real body chars at all. Never reveals more than 4 body chars.
 */
export function mask(secret: string, keepPrefix = 0): string {
  const chars = Array.from(secret);
  const p = Math.min(Math.max(0, Math.floor(keepPrefix)), chars.length);
  const prefix = chars.slice(0, p).join("");
  const body = chars.slice(p);
  const show = body.length >= 12 ? 4 : 0;
  const bullets = Math.min(MAX_BULLETS, Math.max(4, body.length - show));
  const tail = show > 0 ? body.slice(body.length - show).join("") : "";
  return prefix + MASK_CHAR.repeat(bullets) + tail;
}
