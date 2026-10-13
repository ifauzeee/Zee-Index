import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { createPublicRoute } from "@/lib/api-middleware";
import { REDIS_KEYS } from "@/lib/constants";
import { parseShareCollectionItems } from "@/lib/link-payloads";
import { resolveShareGrant, type ShareGrantResult } from "@/lib/share-grant";

export const dynamic = "force-dynamic";

const DENIED: Record<
  Extract<ShareGrantResult, { ok: false }>["reason"],
  { error: string; status: number }
> = {
  invalid: { error: "Invalid or expired share link.", status: 401 },
  revoked: { error: "This share link has been revoked.", status: 403 },
  max_uses: {
    error: "This share link has reached its usage limit.",
    status: 403,
  },
  login_required: {
    error: "Sign in to open this share link.",
    status: 401,
  },
};

export const GET = createPublicRoute(
  async ({ request, params, session }) => {
    const { shareId } = params;
    const shareToken = request.nextUrl.searchParams.get("share_token");

    if (!shareToken) {
      return NextResponse.json(
        { error: "Share token is missing." },
        { status: 401 },
      );
    }

    try {
      // Same checks as every other share access: signature, revocation in
      // Redis and in the database, maxUses and loginRequired.
      const grant = await resolveShareGrant(shareToken, session);
      if (!grant.ok) {
        const { error, status } = DENIED[grant.reason];
        return NextResponse.json({ error }, { status });
      }

      if (grant.record.jti !== shareId || !grant.record.isCollection) {
        return NextResponse.json(
          { error: "Share token does not match this collection." },
          { status: 403 },
        );
      }

      const items = parseShareCollectionItems(
        await kv.get(`${REDIS_KEYS.SHARE_ITEMS}${shareId}`),
      );
      if (!items) {
        return NextResponse.json(
          { error: "Collection not found or expired." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        items,
        collectionName: grant.record.itemName,
      });
    } catch (error) {
      logger.error({ err: error, shareId }, "[ShareItems] Lookup failed");
      return NextResponse.json(
        { error: "Could not load this collection." },
        { status: 500 },
      );
    }
  },
  { includeSession: true, rateLimit: false },
);
