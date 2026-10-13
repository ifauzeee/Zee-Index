import { jwtVerify } from "jose";
import type { Session } from "next-auth";
import type { ShareLink } from "@prisma/client";
import { db } from "@/lib/db";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";
import { parseShareCollectionItems } from "@/lib/link-payloads";

/**
 * A share link grants access to what was shared, and nothing else (Z2-04):
 * the shared file, the shared folder and everything below it, or each item
 * of a shared collection. Grants travel through isAccessRestricted as
 * `share:<id>` entries in allowedTokens, which it honors for the item and
 * its descendants even when they sit in a protected folder.
 */

const SHARE_GRANT_PREFIX = "share:";

export function shareGrantToken(itemId: string): string {
  return `${SHARE_GRANT_PREFIX}${itemId}`;
}

export function isShareGrantFor(allowedTokens: string[], id: string): boolean {
  return allowedTokens.includes(shareGrantToken(id));
}

/** Item ids granted by share links among `allowedTokens`. */
export function sharedItemIds(allowedTokens: string[]): string[] {
  return allowedTokens
    .filter((t) => t.startsWith(SHARE_GRANT_PREFIX))
    .map((t) => t.slice(SHARE_GRANT_PREFIX.length));
}

/**
 * Item id a stored share path points at. Paths are `/folder/<id>` for a
 * folder and `/folder/<parent>/file/<id>/<slug>` for a file; links created
 * before grants existed carry no separate id, so this is how they keep
 * working.
 */
export function idFromSharePath(sharePath: string): string | null {
  const match = sharePath.match(/^\/folder\/(.+)$/);
  if (!match) return null;
  const rest = match[1];

  const fileMarker = rest.indexOf("/file/");
  if (fileMarker === -1) return safeDecode(rest);

  const afterMarker = rest.slice(fileMarker + "/file/".length);
  const slugStart = afterMarker.lastIndexOf("/");
  const fileId =
    slugStart === -1 ? afterMarker : afterMarker.slice(0, slugStart);
  return fileId ? safeDecode(fileId) : null;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export type ShareGrantResult =
  | { ok: true; record: ShareLink; itemIds: string[] }
  | {
      ok: false;
      reason: "invalid" | "revoked" | "max_uses" | "login_required";
    };

/** Validate a share token and work out which items it opens. */
export async function resolveShareGrant(
  shareToken: string,
  session: Session | null,
): Promise<ShareGrantResult> {
  const shareSecret = process.env.SHARE_SECRET_KEY;
  if (!shareSecret || shareSecret.length < 32) {
    return { ok: false, reason: "invalid" };
  }

  let jti: string;
  try {
    const { payload } = await jwtVerify(
      shareToken,
      new TextEncoder().encode(shareSecret),
    );
    if (typeof payload.jti !== "string") {
      return { ok: false, reason: "invalid" };
    }
    jti = payload.jti;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (await kv.get(`${REDIS_KEYS.SHARE_BLOCKED}${jti}`)) {
    return { ok: false, reason: "revoked" };
  }

  const record = await db.shareLink.findUnique({ where: { jti } });
  if (!record || record.revokedAt) return { ok: false, reason: "revoked" };
  if (record.maxUses !== null && record.views >= record.maxUses) {
    return { ok: false, reason: "max_uses" };
  }
  if (record.loginRequired && !session) {
    return { ok: false, reason: "login_required" };
  }

  let itemIds: string[];
  if (record.isCollection) {
    const items = parseShareCollectionItems(
      await kv.get(`${REDIS_KEYS.SHARE_ITEMS}${jti}`),
    );
    itemIds = (items ?? []).map((item) => item.id);
  } else {
    const id = idFromSharePath(record.path);
    itemIds = id ? [id] : [];
  }

  return { ok: true, record, itemIds };
}

/** `share:<id>` tokens for a request's `share_token`, or [] when it grants nothing. */
export async function shareGrantTokens(
  shareToken: string | null | undefined,
  session: Session | null,
): Promise<string[]> {
  if (!shareToken) return [];
  const grant = await resolveShareGrant(shareToken, session);
  return grant.ok ? grant.itemIds.map(shareGrantToken) : [];
}

const VIEW_DEDUPE_SECONDS = 600;

/**
 * Count one use of a share link per viewer per 10 minutes, on the server.
 * maxUses used to rely on the client calling /api/share/track, and range
 * requests and local/provider downloads were never counted (Z2-04).
 */
export async function recordShareView(
  jti: string,
  viewerKey: string,
): Promise<void> {
  const dedupeKey = `share:viewed:${jti}:${viewerKey}`;
  const seen = await kv.incr(dedupeKey);
  if (seen !== 1) return;
  await kv.expire(dedupeKey, VIEW_DEDUPE_SECONDS);
  await db.shareLink.update({
    where: { jti },
    data: { views: { increment: 1 } },
  });
}
