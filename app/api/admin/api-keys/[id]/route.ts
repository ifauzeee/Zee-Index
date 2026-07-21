import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { clearApiKeyCache } from "@/lib/api-key";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Revoke (soft-delete) an API key by setting revoked = true. */
export const DELETE = createAdminRoute(async ({ params }) => {
  const { id } = params as { id: string };

  const key = await db.apiKey.findUnique({ where: { id } });
  if (!key) {
    return NextResponse.json({ error: "API key not found." }, { status: 404 });
  }

  await db.apiKey.update({
    where: { id },
    data: { revoked: true },
  });

  // Clear cache so subsequent requests with this key are rejected
  await clearApiKeyCache(key.keyPrefix);

  logger.info({ keyId: id, keyPrefix: key.keyPrefix }, "API key revoked");

  return NextResponse.json({ success: true });
});
