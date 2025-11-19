import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import type { ActivityLog } from "@/lib/activityLogger";
import { z } from "zod";

import { type Session } from "next-auth";

const ACTIVITY_LOG_KEY = "zee-index:activity-log";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const validation = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!validation.success) {
    return NextResponse.json(
      { error: "Parameter query tidak valid." },
      { status: 400 },
    );
  }

  const { page, limit } = validation.data;
  const offset = (page - 1) * limit;

  try {
    const totalLogs = await kv.zcard(ACTIVITY_LOG_KEY);
    const totalPages = Math.ceil(totalLogs / limit);

    const logStrings: string[] = await kv.zrange(
      ACTIVITY_LOG_KEY,
      offset,
      offset + limit - 1,
      { rev: true },
    );

    const logs: ActivityLog[] = logStrings
      .map((logStr) => {
        try {
          return typeof logStr === "string" ? JSON.parse(logStr) : logStr;
        } catch (e) {
          console.error("Gagal mem-parsing entri log:", logStr, e);
          return null;
        }
      })
      .filter((log): log is ActivityLog => log !== null);

    return NextResponse.json({
      logs,
      totalPages,
      currentPage: page,
      totalLogs,
    });
  } catch (error) {
    console.error("Gagal mengambil log aktivitas:", error);
    return NextResponse.json(
      { error: "Gagal mengambil log aktivitas." },
      { status: 500 },
    );
  }
}
