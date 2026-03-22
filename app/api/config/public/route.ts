import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";

const CONFIG_KEY = "zee-index:config";
export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async () => {
    try {
      const config: {
        disableGuestLogin?: boolean;
        hideAuthor?: boolean;
      } | null = await kv.get(CONFIG_KEY);

      return NextResponse.json({
        disableGuestLogin: config?.disableGuestLogin || false,
        hideAuthor: config?.hideAuthor || false,
      });
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
