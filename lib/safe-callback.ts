/**
 * A post-login redirect target that stays on this site (Z2-12). Only plain
 * same-origin paths are allowed; `//host`, `/\host`, absolute URLs and
 * `javascript:` all fall back to the home page.
 */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  // Control characters can make some browsers normalize the path into a
  // protocol-relative URL.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return "/";
  return raw;
}
