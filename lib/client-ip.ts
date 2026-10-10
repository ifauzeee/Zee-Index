/**
 * Resolve the client IP from the request headers.
 *
 * `x-forwarded-for` is a comma-separated chain built up by every proxy the
 * request passes through, so the left-most entry is client-controlled and
 * trivially spoofable. The right-most non-empty entry is the one appended by
 * the nearest trusted hop, which is the value used for rate-limit and audit
 * identity. `x-real-ip` is the single-IP equivalent set by some proxies.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      return hops[hops.length - 1];
    }
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    const trimmed = realIp.trim();
    if (trimmed) return trimmed;
  }

  return "127.0.0.1";
}
