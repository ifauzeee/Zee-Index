import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicRoute } from "@/lib/api-middleware";
import {
  isAllowedSetupRequestOrigin,
  readEnvFile,
  savePendingSetup,
  setupAccessError,
} from "@/lib/setup-session";

export const dynamic = "force-dynamic";

const prepareSchema = z.object({
  clientId: z.string().trim().max(512).optional(),
  clientSecret: z.string().trim().max(512).optional(),
  rootFolderId: z.string().trim().max(256).optional(),
  setupToken: z.string().trim().max(256).optional(),
});

/**
 * First half of the setup wizard: checks who is running setup, keeps the
 * values they typed on the server for 10 minutes, and returns the OAuth
 * `state` to send to Google. /api/setup/finish redeems the state, so the
 * client secret and setup token never have to sit in browser storage.
 */
export const POST = createPublicRoute(
  async ({ request, body, session }) => {
    if (!isAllowedSetupRequestOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const denied = await setupAccessError(
      readEnvFile(),
      session,
      body.setupToken,
    );
    if (denied) {
      return NextResponse.json(
        { error: denied.error },
        { status: denied.status },
      );
    }

    const state = await savePendingSetup({
      clientId: body.clientId || undefined,
      clientSecret: body.clientSecret || undefined,
      rootFolderId: body.rootFolderId || undefined,
      setupToken: body.setupToken || undefined,
    });

    return NextResponse.json(
      { state },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
  { bodySchema: prepareSchema, includeSession: true, rateLimit: "AUTH" },
);
