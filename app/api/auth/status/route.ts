import { NextResponse } from "next/server";
import { checkGoogleDriveHealth } from "@/lib/services/health-service";
import { createPublicRoute } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async () => {
    try {
      const driveHealth = await checkGoogleDriveHealth();

      return NextResponse.json({
        status: driveHealth.status,
        error: driveHealth.error,
      });
    } catch (error) {
      console.error("[Auth Status API] Error:", error);
      return NextResponse.json(
        { status: "unhealthy", error: "Gagal memeriksa status autentikasi." },
        { status: 500 },
      );
    }
  },
  { rateLimit: false },
);
