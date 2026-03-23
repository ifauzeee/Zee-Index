import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getPublicAppConfig } from "@/lib/app-config";
export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async () => {
    try {
      const config = await getPublicAppConfig();
      return NextResponse.json(config);
    } catch (error) {
      console.error("Gagal mengambil konfigurasi publik:", error);
      return NextResponse.json(
        { error: "Gagal mengambil konfigurasi." },
        { status: 500 },
      );
    }
  },
  { rateLimit: false },
);
