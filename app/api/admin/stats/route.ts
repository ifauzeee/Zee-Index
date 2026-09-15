import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import type {
  AdminStats,
  HourlyDownload,
  TopFile,
  DayOfWeekDownload,
  TopUser,
} from "@/lib/adminStats";
import { startOfToday, subDays } from "date-fns";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

import { getAnalyticsData } from "@/lib/analyticsTracker";

const getAdminStatsCached = unstable_cache(
  async () => {
    const todayStart = startOfToday().getTime();
    const ninetyDaysAgo = subDays(new Date(), 90).getTime();
    const sevenWeeksAgo = subDays(new Date(), 49).getTime();

    const [
      downloadsTodayRows,
      downloadsByDayRows,
      topFilesRows,
      topUsersRows,
      topUploadedRows,
      fileTypeRows,
    ] = await Promise.all([
      // Downloads today — grouped by hour
      db.$queryRawUnsafe<{ hour: number; count: bigint }[]>(
        `SELECT EXTRACT(HOUR FROM TO_TIMESTAMP(timestamp / 1000))::int AS hour, COUNT(*)::bigint AS count
         FROM "ActivityLog"
         WHERE type = 'DOWNLOAD' AND timestamp >= $1
         GROUP BY hour ORDER BY hour`,
        todayStart,
      ),
      // Downloads by day of week (last 7 weeks)
      db.$queryRawUnsafe<{ dow: number; count: bigint }[]>(
        `SELECT EXTRACT(DOW FROM TO_TIMESTAMP(timestamp / 1000))::int AS dow, COUNT(*)::bigint AS count
         FROM "ActivityLog"
         WHERE type = 'DOWNLOAD' AND timestamp >= $1
         GROUP BY dow ORDER BY dow`,
        sevenWeeksAgo,
      ),
      // Top downloaded files
      db.$queryRawUnsafe<{ name: string; count: bigint }[]>(
        `SELECT "itemName" AS name, COUNT(*)::bigint AS count
         FROM "ActivityLog"
         WHERE type = 'DOWNLOAD' AND "itemName" IS NOT NULL AND timestamp >= $1
         GROUP BY "itemName" ORDER BY count DESC LIMIT 5`,
        ninetyDaysAgo,
      ),
      // Top users
      db.$queryRawUnsafe<{ email: string; count: bigint }[]>(
        `SELECT "userEmail" AS email, COUNT(*)::bigint AS count
         FROM "ActivityLog"
         WHERE "userEmail" IS NOT NULL AND timestamp >= $1
         GROUP BY "userEmail" ORDER BY count DESC LIMIT 5`,
        ninetyDaysAgo,
      ),
      // Top uploaded files
      db.$queryRawUnsafe<{ name: string; count: bigint }[]>(
        `SELECT "itemName" AS name, COUNT(*)::bigint AS count
         FROM "ActivityLog"
         WHERE type = 'UPLOAD' AND "itemName" IS NOT NULL AND timestamp >= $1
         GROUP BY "itemName" ORDER BY count DESC LIMIT 5`,
        ninetyDaysAgo,
      ),
      // File type distribution
      db.$queryRawUnsafe<{ type: string; count: bigint }[]>(
        `SELECT
           CASE
             WHEN LENGTH(SPLIT_PART("itemName", '.', -1)) <= 5
               THEN UPPER(SPLIT_PART("itemName", '.', -1))
             ELSE 'OTHER'
           END AS type,
           COUNT(*)::bigint AS count
         FROM "ActivityLog"
         WHERE type = 'DOWNLOAD' AND "itemName" IS NOT NULL AND timestamp >= $1
         GROUP BY 1 ORDER BY count DESC LIMIT 5`,
        ninetyDaysAgo,
      ),
    ]);

    const downloadsToday: HourlyDownload[] = Array(24)
      .fill(0)
      .map((_, i) => ({
        name: `${i}:00`,
        downloads: 0,
      }));
    for (const row of downloadsTodayRows) {
      downloadsToday[row.hour].downloads = Number(row.count);
    }

    const downloadsByDayOfWeek: DayOfWeekDownload[] = [
      { name: "Min", downloads: 0 },
      { name: "Sen", downloads: 0 },
      { name: "Sel", downloads: 0 },
      { name: "Rab", downloads: 0 },
      { name: "Kam", downloads: 0 },
      { name: "Jum", downloads: 0 },
      { name: "Sab", downloads: 0 },
    ];
    for (const row of downloadsByDayRows) {
      downloadsByDayOfWeek[row.dow].downloads = Number(row.count);
    }

    const topFiles: TopFile[] = topFilesRows.map((r) => ({
      name: r.name,
      count: Number(r.count),
    }));

    const topUsers: TopUser[] = topUsersRows.map((r) => ({
      email: r.email,
      count: Number(r.count),
    }));

    const topUploadedFiles: TopFile[] = topUploadedRows.map((r) => ({
      name: r.name,
      count: Number(r.count),
    }));

    const fileTypeDistribution = fileTypeRows.map((r) => ({
      type: r.type,
      count: Number(r.count),
    }));

    const analyticsData = await getAnalyticsData();

    return {
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
    } satisfies AdminStats;
  },
  ["admin-stats"],
  { revalidate: 300, tags: ["admin-stats"] },
);

export const GET = createAdminRoute(async () => {
  try {
    const stats = await getAdminStatsCached();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch admin stats");
    return NextResponse.json(
      { error: "Failed to fetch admin stats." },
      { status: 500 },
    );
  }
});
