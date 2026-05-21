import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getAnyFileDetails } from "@/lib/storage";
import { validateShareToken } from "@/lib/auth";
import { isAccessRestricted } from "@/lib/securityUtils";

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

    const isAdmin = session?.user?.role === "ADMIN";

    if (fileId.startsWith("local-storage:") && !isAdmin) {
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
    } else if (!isAdmin) {
      const isRestricted = await isAccessRestricted(fileId);
      if (isRestricted) {
        return NextResponse.json({ error: "Access Denied" }, { status: 403 });
      }
    }

    try {
      const details = await getAnyFileDetails(fileId);
      return NextResponse.json(details, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=600",
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak dikenal.";
      logger.error({ err: errorMessage }, "File Details API Error");
      return NextResponse.json(
        { error: "Gagal mengambil detail file.", details: errorMessage },
        { status: 500 },
      );
    }
  },
  { includeSession: true, rateLimit: false },
);
