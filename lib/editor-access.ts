import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { collectAccessTokens } from "@/lib/auth";
import { isAccessRestricted } from "@/lib/securityUtils";

/**
 * Editors may only change items they could open themselves, including the
 * source and destination folders of a move. Without this an editor could
 * move a file out of a protected folder into a public one (Z2-05).
 * Admins are unrestricted.
 */
export async function canModifyAll(
  request: NextRequest,
  session: Session,
  ids: string[],
): Promise<boolean> {
  if (session.user?.role === "ADMIN") return true;

  const bearer = request.headers.get("Authorization")?.split(" ")[1];
  const tokens = await collectAccessTokens(request.cookies.getAll(), bearer);
  const restricted = await Promise.all(
    [...new Set(ids)].map((id) =>
      isAccessRestricted(id, tokens, session.user?.email),
    ),
  );
  return restricted.every((isRestricted) => !isRestricted);
}
