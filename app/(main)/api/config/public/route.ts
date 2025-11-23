import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const CONFIG_KEY = "zee-index:config";
export async function GET() {
  try {
    const config: { disableGuestLogin?: boolean; hideAuthor?: boolean } | null =
      await kv.get(CONFIG_KEY);

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
}
