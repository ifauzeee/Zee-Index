import { logger } from "@/lib/logger";

import { getErrorMessage } from "@/lib/errors";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getStorageDetails } from "@/lib/drive";
import { isAccessRestricted } from "@/lib/securityUtils";
export const GET = createPublicRoute(
  async ({ session }) => {
    try {
      const details = await getStorageDetails();
      const isAdmin = session?.user?.role === "ADMIN";

      if (!isAdmin) {
        const allowedFiles = [];
        for (const file of details.largestFiles) {
          const restricted = await isAccessRestricted(file.id);
          if (!restricted) {
            allowedFiles.push(file);
          }
        }
        details.largestFiles = allowedFiles;
      }

      return NextResponse.json(details);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        "Terjadi kesalahan tidak dikenal.",
      );
      logger.error({ err: errorMessage }, "Storage Details API Error");
      return NextResponse.json(
        { error: "Gagal mengambil detail penyimpanan.", details: errorMessage },
        { status: 500 },
      );
    }
  },
  { includeSession: true },
);
