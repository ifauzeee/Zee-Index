import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getAnyFileDetails } from "@/lib/storage";
import { validateShareToken } from "@/lib/auth";
import { isAccessRestricted } from "@/lib/securityUtils";
import { normalizeLocalStorageId } from "@/lib/storage/local";
import { ERROR_MESSAGES } from "@/lib/constants";

import { getErrorMessage } from "@/lib/errors";
export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async ({ request, session }) => {
    const isShareAuth = await validateShareToken(request);

    if (!session && !isShareAuth) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const fileIdRaw = searchParams.get("fileId");
    if (!fileIdRaw) {
      return NextResponse.json(
        { error: "Parameter fileId tidak ditemukan." },
        { status: 400 },
      );
    }
    const fileId = decodeURIComponent(fileIdRaw);
    const normalizedFileId = fileId.startsWith("local-storage:")
      ? normalizeLocalStorageId(fileId)
      : fileId;

    if (normalizedFileId === null) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_FILE_ID },
        { status: 400 },
      );
    }

    const isAdmin = session?.user?.role === "ADMIN";

    if (normalizedFileId.startsWith("local-storage:") && !isAdmin) {
      const hasAccess = await import("@/lib/auth").then((m) =>
        m.checkLocalStorageAccess(request),
      );
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: "Autentikasi Local Storage diperlukan",
            isLocalAuthNeeded: true,
          },
          { status: 401 },
        );
      }
    }

    if (!isAdmin) {
      const isRestricted = await isAccessRestricted(
        normalizedFileId,
        [],
        session?.user?.email,
      );
      if (isRestricted) {
        return NextResponse.json({ error: "Access Denied" }, { status: 403 });
      }
    }

    try {
      const details = await getAnyFileDetails(normalizedFileId);
      return NextResponse.json(details, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=600",
        },
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        "Terjadi kesalahan tidak dikenal.",
      );
      logger.error({ err: errorMessage }, "File Details API Error");
      return NextResponse.json(
        { error: "Gagal mengambil detail file." },
        { status: 500 },
      );
    }
  },
  { includeSession: true, rateLimit: false },
);
