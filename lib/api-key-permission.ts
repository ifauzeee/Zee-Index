import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Check whether the current request (if authenticated via API key) has the
 * required permission. Returns `null` if the request is not using an API key
 * or if the key has the required permission. Returns a 403 `Response` if the
 * key lacks the permission.
 *
 * Usage in route handlers:
 * ```
 * const permissionError = requireApiPermission(request, "files:read");
 * if (permissionError) return permissionError;
 * ```
 */
export function requireApiPermission(
  request: NextRequest | Request,
  permission: string,
): Response | null {
  const req = request as NextRequest & { headers: Headers };
  const method = req.headers.get("x-auth-method");
  if (method !== "api-key") return null; // not an API key request, skip

  const perms = req.headers.get("x-api-key-permissions")?.split(",") || [];
  if (perms.includes("*") || perms.includes(permission)) return null;

  return NextResponse.json(
    { error: "API key does not have the required permission." },
    { status: 403 },
  );
}
