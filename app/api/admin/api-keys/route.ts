import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/api-key";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** List all API keys (without hashes). */
export const GET = createAdminRoute(async () => {
  const keys = await db.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      createdBy: true,
      revoked: true,
    },
  });

  return NextResponse.json({ keys });
});

/** Create a new API key. */
export const POST = createAdminRoute(async ({ body, session }) => {
  const { name, permissions, expiresAt } = (body || {}) as {
    name?: string;
    permissions?: string[];
    expiresAt?: string | null;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return NextResponse.json(
      { error: "At least one permission is required." },
      { status: 400 },
    );
  }

  const { raw, prefix, hash } = generateApiKey();

  await db.apiKey.create({
    data: {
      name: name.trim(),
      keyPrefix: prefix,
      keyHash: hash,
      permissions,
      createdBy: session?.user?.email || "unknown",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  logger.info({ keyPrefix: prefix }, "API key created");

  return NextResponse.json({
    apiKey: raw,
    prefix,
    name: name.trim(),
    permissions,
  });
});
