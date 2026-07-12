import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import {
  MANUAL_DRIVES_KEY,
  parseManualDriveRecords,
} from "@/lib/manual-drives";

export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async () => {
    try {
      // parseManualDriveRecords only keeps public fields (no password hashes).
      const drives = parseManualDriveRecords(await kv.get(MANUAL_DRIVES_KEY));
      return NextResponse.json(drives);
    } catch (error) {
      logger.error({ err: error }, "Public manual-drives fetch error");
      return NextResponse.json(
        { error: "Failed to fetch manual drives" },
        { status: 500 },
      );
    }
  },
  { rateLimit: "API", includeSession: false },
);
