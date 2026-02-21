import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { getActivityLogs } from "@/lib/activityLogger";
import { z } from "zod";

import { type Session } from "next-auth";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

export const dynamic = "force-dynamic";

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
    const totalLogs = await db.activityLog.count();
    const totalPages = Math.ceil(totalLogs / limit);

    const logs = await getActivityLogs(limit, offset);

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
