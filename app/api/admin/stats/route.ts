import { NextResponse } from "next/server";
import type { ActivityLog as DbActivityLog } from "@prisma/client";
import { createAdminRoute } from "@/lib/api-middleware";
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
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

import { getAnalyticsData } from "@/lib/analyticsTracker";
import { type ActivityType } from "@/lib/activityLogger";

function toActivityLog(log: DbActivityLog): ActivityLog {
  return {
    id: log.id,
    type: log.type as ActivityType,
    timestamp: log.timestamp,
    severity: log.severity as ActivityLog["severity"],
    itemName: log.itemName ?? undefined,
    itemId: log.itemId ?? undefined,
    itemSize: log.itemSize ?? undefined,
    itemType: log.itemType ?? undefined,
    userEmail: log.userEmail ?? undefined,
    userId: log.userId ?? undefined,
    userRole: (log.userRole as ActivityLog["userRole"] | null) ?? undefined,
    targetUser: log.targetUser ?? undefined,
    destinationFolder: log.destinationFolder ?? undefined,
    sourcePath: log.sourcePath ?? undefined,
    targetPath: log.targetPath ?? undefined,
    status: (log.status as ActivityLog["status"] | null) ?? undefined,
    error: log.error ?? undefined,
    errorCode: log.errorCode ?? undefined,
    ipAddress: log.ipAddress ?? undefined,
    userAgent: log.userAgent ?? undefined,
    country: log.country ?? undefined,
    city: log.city ?? undefined,
    metadata: log.metadata
      ? (JSON.parse(log.metadata) as Record<string, unknown>)
      : undefined,
  };
}

const getAdminStatsCached = unstable_cache(
  async () => {
    const ninetyDaysAgo = subDays(new Date(), 90).getTime();
    const allLogsRaw = await db.activityLog.findMany({
      where: { timestamp: { gte: ninetyDaysAgo } },
    });

    const allLogs = allLogsRaw.map(toActivityLog);

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
    const typeCounts = new Map<string, number>();

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

          const ext = log.itemName.split(".").pop()?.toUpperCase() || "UNKNOWN";
          if (ext.length <= 5) {
            typeCounts.set(ext, (typeCounts.get(ext) || 0) + 1);
          } else {
            typeCounts.set("OTHER", (typeCounts.get("OTHER") || 0) + 1);
          }
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

    const fileTypeDistribution = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    const analyticsData = await getAnalyticsData();

    const stats: AdminStats = {
      downloadsToday,
      topFiles,
      downloadsByDayOfWeek,
      topUsers,
      topUploadedFiles,
      fileTypeDistribution,
      bandwidthSummary: {
        today: analyticsData.bandwidth.totalToday,
        thisWeek: analyticsData.bandwidth.totalThisWeek,
        thisMonth: analyticsData.bandwidth.totalThisMonth,
      },
    };

    return stats;
  },
  ["admin-stats"],
  { revalidate: 300, tags: ["admin-stats"] },
);

export const GET = createAdminRoute(async () => {
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
});
