import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/api-key";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required."),
  permissions: z
    .array(z.string())
    .min(1, "At least one permission is required."),
  expiresAt: z.string().nullable().optional(),
});

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
export const POST = createAdminRoute(
  async ({ body, session }) => {
    const { name, permissions, expiresAt } = body;

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
  },
  {
    bodySchema: createApiKeySchema,
  },
);
