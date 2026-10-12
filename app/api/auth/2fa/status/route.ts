import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import { getTwoFactorState } from "@/lib/credentials";

export const dynamic = "force-dynamic";

export const GET = createUserRoute(
  async ({ session }) => {
    try {
      // requireEmail guarantees an email on the session.
      const userEmail = session.user.email!;
      const { enabled } = await getTwoFactorState(userEmail);

      return NextResponse.json({ isEnabled: enabled });
    } catch (error) {
      logger.error({ err: error }, "2FA Status Check Error");
      return NextResponse.json(
        { error: "Gagal memeriksa status 2FA." },
        { status: 500 },
      );
    }
  },
  { requireEmail: true },
);
