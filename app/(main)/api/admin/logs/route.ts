import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";

import type { ActivityLog } from "@/lib/activityLogger";

import { type Session } from "next-auth";

const ACTIVITY_LOG_KEY = "zee-index:activity-log";
const LOGS_PER_PAGE = 50;

async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const logStrings: string[] = await kv.zrange(
      ACTIVITY_LOG_KEY,
      offset,
      offset + LOGS_PER_PAGE - 1,
      { rev: true },
    );

    const logs: ActivityLog[] = logStrings
      .map((logStr) => {
        try {
          return JSON.parse(logStr);
        } catch (e) {
          console.error("Gagal mem-parsing entri log:", logStr, e);
          return null;
        }
      })
      .filter((log): log is ActivityLog => log !== null);

    return NextResponse.json({
      logs,
      hasMore: logs.length === LOGS_PER_PAGE,
    });
  } catch (error) {
    console.error("Gagal mengambil log aktivitas:", error);
    return NextResponse.json(
      { error: "Gagal mengambil log aktivitas." },
      { status: 500 },
    );
  }
}
