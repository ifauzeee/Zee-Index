import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { getActivityLogs } from "@/lib/activityLogger";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async ({ request }) => {
  const validation = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

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
});
