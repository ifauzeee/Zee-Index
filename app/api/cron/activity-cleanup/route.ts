import { NextResponse } from "next/server";
import { createCronRoute } from "@/lib/api-middleware";
import { cleanupOldActivityLogs } from "@/lib/activity-cleanup";

export const dynamic = "force-dynamic";

export const GET = createCronRoute(async () => {
  try {
    const deletedCount = await cleanupOldActivityLogs();

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old activity log entries.`,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
