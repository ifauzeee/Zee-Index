import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";

export const dynamic = "force-dynamic";

export const GET = createUserRoute(
  async ({ session }) => {
    try {
      const userEmail = session.user.email;
      const isEnabled = await kv.get(`2fa:enabled:${userEmail}`);

      return NextResponse.json({ isEnabled: !!isEnabled });
    } catch (error) {
      console.error("2FA Status Check Error:", error);
      return NextResponse.json(
        { error: "Gagal memeriksa status 2FA." },
        { status: 500 },
      );
    }
  },
  { requireEmail: true },
);
