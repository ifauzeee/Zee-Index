import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async ({ session }) => {
    if (!session || !session.user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: session.user });
  },
  { includeSession: true, rateLimit: false },
);
