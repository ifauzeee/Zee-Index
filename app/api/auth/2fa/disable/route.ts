import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";
import { kv } from "@/lib/kv";
import { checkRateLimit } from "@/lib/ratelimit";

export const POST = createUserRoute(
  async ({ request, session }) => {
    const { success } = await checkRateLimit(request, "AUTH");
    if (!success) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
        { status: 429 },
      );
    }

    try {
      const userEmail = session.user.email;

      await kv.del(`2fa:secret:${userEmail}`);
      await kv.del(`2fa:enabled:${userEmail}`);

      return NextResponse.json({
        success: true,
        message: "2FA berhasil dinonaktifkan.",
      });
    } catch (error) {
      console.error("2FA Disable Error:", error);
      return NextResponse.json(
        { error: "Gagal menonaktifkan 2FA." },
        { status: 500 },
      );
    }
  },
  { requireEmail: true, rateLimit: false },
);
