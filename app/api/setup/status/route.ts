import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

/**
 * Which Google values the setup wizard can take from the environment, so it
 * only asks for what is missing. The client ID and root folder ID are public
 * anyway (both end up in the browser); the client secret is never returned,
 * only whether it is set.
 */
export const GET = createPublicRoute(
  async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || null;
    const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID?.trim() || null;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET?.trim();

    return NextResponse.json(
      { clientId, rootFolderId, hasClientSecret },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
  { rateLimit: "API" },
);
