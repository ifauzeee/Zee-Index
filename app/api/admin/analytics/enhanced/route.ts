import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { memoryCache } from "@/lib/memory-cache";
import { startOfToday, startOfWeek, startOfMonth, subDays } from "date-fns";

export const dynamic = "force-dynamic";
export const ANALYTICS_SECURITY_EVENTS_TAKE_LIMIT = 10;

interface CountRow {
  count: number | bigint;
}

interface DailyTrendRow extends CountRow {
  day: string;
  type: string;
}

interface HourlyActivityRow extends CountRow {
  hour: number | bigint;
}

interface RealtimeStatsRow {
  activeUsersLast5Min: number | bigint;
  requestsLast5Min: number | bigint;
  requestsLastHour: number | bigint;
}

interface EngagementStatsRow {
  uniqueUsersToday: number | bigint;
  uniqueUsersThisWeek: number | bigint;
  uniqueUsersThisMonth: number | bigint;
  totalActionsToday: number | bigint;
  errorActionsToday: number | bigint;
}

interface ActivityBreakdownRow extends CountRow {
  type: string;
}

function toCount(value: number | bigint | null | undefined): number {
  if (typeof value === "bigint") return Number(value);
  return value ?? 0;
}

export const GET = createAdminRoute(async () => {
  try {
    const now = Date.now();
    const todayStart = startOfToday().getTime();
    const weekStart = startOfWeek(new Date()).getTime();
    const monthStart = startOfMonth(new Date()).getTime();
    const thirtyDaysAgo = subDays(new Date(), 30).getTime();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const [
      dailyTrendRows,
      hourlyActivityRows,
      realtimeRows,
      engagementRows,
      activityBreakdownRows,
      securityEvents,
    ] = await Promise.all([
      db.$queryRaw<DailyTrendRow[]>`
        SELECT
          TO_CHAR(
            DATE_TRUNC('day', TO_TIMESTAMP("timestamp" / 1000.0) AT TIME ZONE 'UTC'),
            'YYYY-MM-DD'
          ) AS day,
          type,
          COUNT(*)::int AS count
        FROM "ActivityLog"
        WHERE "timestamp" >= ${thirtyDaysAgo}
          AND type IN ('DOWNLOAD', 'UPLOAD', 'VIEW', 'PREVIEW')
        GROUP BY day, type
      `,
      db.$queryRaw<HourlyActivityRow[]>`
        SELECT
          EXTRACT(HOUR FROM TO_TIMESTAMP("timestamp" / 1000.0) AT TIME ZONE 'UTC')::int AS hour,
          COUNT(*)::int AS count
        FROM "ActivityLog"
        WHERE "timestamp" >= ${thirtyDaysAgo}
        GROUP BY hour
      `,
      db.$queryRaw<RealtimeStatsRow[]>`
        SELECT
          COUNT(DISTINCT "userEmail") FILTER (
            WHERE "timestamp" >= ${fiveMinutesAgo} AND "userEmail" IS NOT NULL
          )::int AS "activeUsersLast5Min",
          COUNT(*) FILTER (WHERE "timestamp" >= ${fiveMinutesAgo})::int AS "requestsLast5Min",
          COUNT(*) FILTER (WHERE "timestamp" >= ${oneHourAgo})::int AS "requestsLastHour"
        FROM "ActivityLog"
        WHERE "timestamp" >= ${oneHourAgo}
      `,
      db.$queryRaw<EngagementStatsRow[]>`
        SELECT
          COUNT(DISTINCT "userEmail") FILTER (
            WHERE "timestamp" >= ${todayStart} AND "userEmail" IS NOT NULL
          )::int AS "uniqueUsersToday",
          COUNT(DISTINCT "userEmail") FILTER (
            WHERE "timestamp" >= ${weekStart} AND "userEmail" IS NOT NULL
          )::int AS "uniqueUsersThisWeek",
          COUNT(DISTINCT "userEmail") FILTER (
            WHERE "timestamp" >= ${monthStart} AND "userEmail" IS NOT NULL
          )::int AS "uniqueUsersThisMonth",
          COUNT(*) FILTER (WHERE "timestamp" >= ${todayStart})::int AS "totalActionsToday",
          COUNT(*) FILTER (
            WHERE "timestamp" >= ${todayStart}
              AND severity IN ('error', 'critical')
          )::int AS "errorActionsToday"
        FROM "ActivityLog"
        WHERE "timestamp" >= ${monthStart}
      `,
      db.$queryRaw<ActivityBreakdownRow[]>`
        SELECT type, COUNT(*)::int AS count
        FROM "ActivityLog"
        WHERE "timestamp" >= ${todayStart}
        GROUP BY type
      `,
      db.activityLog.findMany({
        where: {
          timestamp: { gte: thirtyDaysAgo },
          AND: [
            {
              OR: [
                { type: "UNAUTHORIZED_ACCESS" },
                { type: "LOGIN_FAILURE" },
                { severity: "critical" },
              ],
            },
          ],
        },
        orderBy: { timestamp: "desc" },
        take: ANALYTICS_SECURITY_EVENTS_TAKE_LIMIT,
        select: {
          type: true,
          userEmail: true,
          ipAddress: true,
          timestamp: true,
          severity: true,
        },
      }),
    ]);

    const dailyTrend: Record<
      string,
      { downloads: number; uploads: number; views: number }
    > = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      dailyTrend[key] = { downloads: 0, uploads: 0, views: 0 };
    }

    dailyTrendRows.forEach((row) => {
      const key = row.day;
      if (dailyTrend[key]) {
        if (row.type === "DOWNLOAD")
          dailyTrend[key].downloads += toCount(row.count);
        if (row.type === "UPLOAD")
          dailyTrend[key].uploads += toCount(row.count);
        if (row.type === "VIEW" || row.type === "PREVIEW") {
          dailyTrend[key].views += toCount(row.count);
        }
      }
    });

    const hourlyActivity = Array(24).fill(0);
    hourlyActivityRows.forEach((row) => {
      const hour = toCount(row.hour);
      if (hour >= 0 && hour < hourlyActivity.length) {
        hourlyActivity[hour] = toCount(row.count);
      }
    });
    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));

    const activityBreakdown: Record<string, number> = {};
    activityBreakdownRows.forEach((row) => {
      activityBreakdown[row.type] = toCount(row.count);
    });

    const realtimeStats = realtimeRows[0];
    const engagementStats = engagementRows[0];
    const totalActionsToday = toCount(engagementStats?.totalActionsToday);
    const errorActionsToday = toCount(engagementStats?.errorActionsToday);
    const errorRate =
      totalActionsToday > 0 ? (errorActionsToday / totalActionsToday) * 100 : 0;

    const cacheStats = memoryCache.getStats();

    const analytics = {
      realtime: {
        activeUsersLast5Min: toCount(realtimeStats?.activeUsersLast5Min),
        requestsLast5Min: toCount(realtimeStats?.requestsLast5Min),
        requestsLastHour: toCount(realtimeStats?.requestsLastHour),
      },
      engagement: {
        uniqueUsersToday: toCount(engagementStats?.uniqueUsersToday),
        uniqueUsersThisWeek: toCount(engagementStats?.uniqueUsersThisWeek),
        uniqueUsersThisMonth: toCount(engagementStats?.uniqueUsersThisMonth),
        totalActionsToday,
      },
      trends: {
        daily: Object.entries(dailyTrend).map(([date, data]) => ({
          date,
          ...data,
        })),
      },
      peakHours: {
        data: hourlyActivity.map((count, hour) => ({
          hour: `${hour.toString().padStart(2, "0")}:00`,
          count,
        })),
        peakHour: `${peakHour.toString().padStart(2, "0")}:00`,
      },
      health: {
        errorRate: Math.round(errorRate * 100) / 100,
        cacheHitRate: cacheStats.hitRate,
        cacheSize: cacheStats.size,
      },
      activityBreakdown,
      securityEvents,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch enhanced analytics");
    return NextResponse.json(
      { error: "Failed to fetch analytics data." },
      { status: 500 },
    );
  }
});
