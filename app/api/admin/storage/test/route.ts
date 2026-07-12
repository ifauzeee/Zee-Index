import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { getActiveProvider } from "@/lib/storage/providers";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const POST = createAdminRoute(async () => {
  const provider = getActiveProvider();
  if (!provider) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No external storage provider is configured. Set STORAGE_PROVIDER to 's3' or 'webdav'.",
      },
      { status: 400 },
    );
  }

  try {
    await provider.listFiles(provider.rootId, { pageSize: 1 });
    return NextResponse.json({
      ok: true,
      provider: provider.source,
      message: "Connection successful.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown connection error";
    logger.warn(
      { err: error, provider: provider.source },
      "[Storage] Test connection failed",
    );
    return NextResponse.json(
      { ok: false, provider: provider.source, error: message },
      { status: 502 },
    );
  }
});
