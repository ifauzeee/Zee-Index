import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import { z } from "zod";

import { type Session } from "next-auth";

const CONFIG_KEY = "zee-index:config";

interface AppConfig {
  hideAuthor?: boolean;
  disableGuestLogin?: boolean;
  appName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
}

const configSchema = z.object({
  hideAuthor: z.boolean().optional(),
  disableGuestLogin: z.boolean().optional(),
  appName: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().optional(),
});

async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  try {
    const config: AppConfig | null = await kv.get(CONFIG_KEY);
    return NextResponse.json(
      config || { 
        hideAuthor: false, 
        disableGuestLogin: false,
        appName: "Zee Index",
        logoUrl: "",
        faviconUrl: "",
        primaryColor: "" 
      },
    );
  } catch (error) {
    console.error("Gagal mengambil konfigurasi:", error);
    return NextResponse.json(
      { error: "Gagal mengambil konfigurasi." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = configSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: validation.error.issues },
        { status: 400 },
      );
    }

    const currentConfig: AppConfig = (await kv.get(CONFIG_KEY)) || {};
    const newConfig = { ...currentConfig, ...validation.data };
    await kv.set(CONFIG_KEY, newConfig);

    return NextResponse.json({
      success: true,
      message: "Konfigurasi berhasil diperbarui.",
      config: newConfig,
    });
  } catch (error) {
    console.error("Gagal memperbarui konfigurasi:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 },
    );
  }
}