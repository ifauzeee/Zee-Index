import { authenticator } from "otplib";
import { kv } from "@/lib/kv";

const STEP_SECONDS = 30;

/**
 * Check a TOTP code and accept each code at most once per user (Z2-21).
 * A code stays valid for its whole time step, so without this a code seen
 * over a shoulder or in a proxy log could be replayed within that window.
 * `incr` is atomic, so two concurrent requests with the same code cannot
 * both succeed.
 */
export async function verifyTotpOnce(
  email: string,
  token: string,
  secret: string,
): Promise<boolean> {
  const delta = authenticator.checkDelta(token, secret);
  if (delta === null) return false;

  const step = Math.floor(Date.now() / 1000 / STEP_SECONDS) + delta;
  const key = `2fa:used:${email.toLowerCase().trim()}:${step}`;
  const uses = await kv.incr(key);
  if (uses === 1) {
    await kv.expire(key, STEP_SECONDS * 4);
  }
  return uses === 1;
}
