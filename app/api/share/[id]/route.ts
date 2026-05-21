import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { kv } from "@/lib/kv";
import { z } from "zod";

const shareUpdateRequestSchema = z.object({
  loginRequired: z.boolean().optional(),
  maxUses: z.number().nullable().optional(),
  preventDownload: z.boolean().optional(),
  hasWatermark: z.boolean().optional(),
  watermarkText: z.string().nullable().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const PATCH = createAdminRoute(
  async ({ body, params }) => {
    const shareId = params.id;

    try {
      const shareRecord = await db.shareLink.findUnique({
        where: { id: shareId },
      });

      if (!shareRecord) {
        return NextResponse.json(
          { error: "Tautan berbagi tidak ditemukan." },
          { status: 404 },
        );
      }

      const {
        loginRequired,
        maxUses,
        preventDownload,
        hasWatermark,
        watermarkText,
        expiresAt,
      } = body;

      const updateData: Record<string, any> = {};
      if (loginRequired !== undefined) updateData.loginRequired = loginRequired;
      if (maxUses !== undefined) updateData.maxUses = maxUses;
      if (preventDownload !== undefined)
        updateData.preventDownload = preventDownload;
      if (hasWatermark !== undefined) updateData.hasWatermark = hasWatermark;
      if (watermarkText !== undefined) updateData.watermarkText = watermarkText;
      if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt);

      const updated = await db.shareLink.update({
        where: { id: shareId },
        data: updateData,
      });

      // Update Redis settings
      const newExpiresAt = updated.expiresAt;
      const expiresInSeconds = Math.ceil(
        (newExpiresAt.getTime() - Date.now()) / 1000,
      );

      if (expiresInSeconds > 0) {
        await kv.set(
          `share:link:${updated.jti}`,
          {
            loginRequired: updated.loginRequired,
            preventDownload: updated.preventDownload,
            hasWatermark: updated.hasWatermark,
            watermarkText: updated.watermarkText,
            maxUses: updated.maxUses,
            expiresAt: newExpiresAt.toISOString(),
          },
          {
            ex: expiresInSeconds + 3600,
          },
        );
      } else {
        // If expired now, clean up Redis
        await kv.del(`share:link:${updated.jti}`);
      }

      return NextResponse.json({
        success: true,
        updatedShareLink: {
          id: updated.id,
          path: updated.path,
          token: updated.token,
          jti: updated.jti,
          expiresAt: updated.expiresAt.toISOString(),
          loginRequired: updated.loginRequired,
          itemName: updated.itemName,
          isCollection: updated.isCollection,
          maxUses: updated.maxUses,
          preventDownload: updated.preventDownload,
          hasWatermark: updated.hasWatermark,
          watermarkText: updated.watermarkText,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Error updating share link");
      return NextResponse.json(
        { error: "Gagal memperbarui tautan berbagi." },
        { status: 500 },
      );
    }
  },
  { bodySchema: shareUpdateRequestSchema },
);
