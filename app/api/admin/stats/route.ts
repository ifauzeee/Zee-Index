import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import type { ActivityLog } from "@/lib/activityLogger";
import type {
  AdminStats,
  HourlyDownload,
  TopFile,
  DayOfWeekDownload,
  TopUser,
} from "@/lib/adminStats";
import { startOfToday, subDays, getDay } from "date-fns";
import { type Session } from "next-auth";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

const getAdminStatsCached = unstable_cache(
  async () => {
    const ninetyDaysAgo = subDays(new Date(), 90).getTime();
    const allLogsRaw = await db.activityLog.findMany({
      where: { timestamp: { gte: ninetyDaysAgo } },
    });

    const allLogs = allLogsRaw.map(
      (log) =>
        ({
          ...log,
          type: log.type as any,
          severity: log.severity as any,
          metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
        }) as unknown as ActivityLog,
    );

    const todayStart = startOfToday().getTime();
    const sevenWeeksAgo = subDays(new Date(), 49).getTime();

    const downloadsToday: HourlyDownload[] = Array(24)
      .fill(0)
      .map((_, i) => ({
        name: `${i}:00`,
        downloads: 0,
      }));

    const fileCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    const uploadCounts = new Map<string, number>();

    const downloadsByDayOfWeek: DayOfWeekDownload[] = [
      { name: "Min", downloads: 0 },
      { name: "Sen", downloads: 0 },
      { name: "Sel", downloads: 0 },
      { name: "Rab", downloads: 0 },
      { name: "Kam", downloads: 0 },
      { name: "Jum", downloads: 0 },
      { name: "Sab", downloads: 0 },
    ];

    for (const log of allLogs) {
      if (log.userEmail) {
        userCounts.set(log.userEmail, (userCounts.get(log.userEmail) || 0) + 1);
      }

      if (log.type === "UPLOAD" && log.itemName) {
        uploadCounts.set(
          log.itemName,
          (uploadCounts.get(log.itemName) || 0) + 1,
        );
      }

      if (log.type === "DOWNLOAD") {
        if (log.timestamp >= todayStart) {
          const hour = new Date(log.timestamp).getHours();
          downloadsToday[hour].downloads++;
        }

        if (log.timestamp >= sevenWeeksAgo) {
          const dayIndex = getDay(new Date(log.timestamp));
          downloadsByDayOfWeek[dayIndex].downloads++;
        }

        if (log.itemName) {
          fileCounts.set(log.itemName, (fileCounts.get(log.itemName) || 0) + 1);
        }
      }
    }

    const topFiles: TopFile[] = Array.from(fileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topUsers: TopUser[] = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email, count]) => ({ email, count }));

    const topUploadedFiles: TopFile[] = Array.from(uploadCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const stats: AdminStats = {
      downloadsToday,
      topFiles,
      downloadsByDayOfWeek,
      topUsers,
      topUploadedFiles,
    };

    return stats;
  },
  ["admin-stats"],
  { revalidate: 300, tags: ["admin-stats"] },
);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const stats = await getAdminStatsCached();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Gagal mengambil statistik admin:", error);
    return NextResponse.json(
      { error: "Gagal mengambil statistik." },
      { status: 500 },
    );
  }
}
