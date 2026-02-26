import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { memoryCache } from "@/lib/memory-cache";
import { startOfToday, startOfWeek, startOfMonth, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  try {
    const now = Date.now();
    const todayStart = startOfToday().getTime();
    const weekStart = startOfWeek(new Date()).getTime();
    const monthStart = startOfMonth(new Date()).getTime();
    const thirtyDaysAgo = subDays(new Date(), 30).getTime();

    const allLogs = await db.activityLog.findMany({
      where: { timestamp: { gte: thirtyDaysAgo } },
      orderBy: { timestamp: "desc" },
    });

    const last5MinLogs = allLogs.filter(
      (l: any) => l.timestamp >= now - 5 * 60 * 1000,
    );
    const last1HourLogs = allLogs.filter(
      (l: any) => l.timestamp >= now - 60 * 60 * 1000,
    );

    const dailyTrend: Record<
      string,
      { downloads: number; uploads: number; views: number }
    > = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      dailyTrend[key] = { downloads: 0, uploads: 0, views: 0 };
    }

    allLogs.forEach((log: any) => {
      const key = new Date(log.timestamp).toISOString().split("T")[0];
      if (dailyTrend[key]) {
        if (log.type === "DOWNLOAD") dailyTrend[key].downloads++;
        if (log.type === "UPLOAD") dailyTrend[key].uploads++;
        if (log.type === "VIEW" || log.type === "PREVIEW")
          dailyTrend[key].views++;
      }
    });

    const hourlyActivity = Array(24).fill(0);
    allLogs.forEach((log: any) => {
      const hour = new Date(log.timestamp).getHours();
      hourlyActivity[hour]++;
    });
    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));

    const uniqueUsersToday = new Set(
      allLogs
        .filter((l: any) => l.timestamp >= todayStart && l.userEmail)
        .map((l: any) => l.userEmail),
    ).size;

    const uniqueUsersThisWeek = new Set(
      allLogs
        .filter((l: any) => l.timestamp >= weekStart && l.userEmail)
        .map((l: any) => l.userEmail),
    ).size;

    const uniqueUsersThisMonth = new Set(
      allLogs
        .filter((l: any) => l.timestamp >= monthStart && l.userEmail)
        .map((l: any) => l.userEmail),
    ).size;

    const totalActions = allLogs.filter(
      (l: any) => l.timestamp >= todayStart,
    ).length;
    const errorActions = allLogs.filter(
      (l: any) =>
        l.timestamp >= todayStart &&
        (l.severity === "error" || l.severity === "critical"),
    ).length;
    const errorRate =
      totalActions > 0 ? (errorActions / totalActions) * 100 : 0;

    const activityBreakdown: Record<string, number> = {};
    allLogs
      .filter((l: any) => l.timestamp >= todayStart)
      .forEach((log: any) => {
        activityBreakdown[log.type] = (activityBreakdown[log.type] || 0) + 1;
      });

    const securityEvents = allLogs
      .filter(
        (l: any) =>
          l.type === "UNAUTHORIZED_ACCESS" ||
          l.type === "LOGIN_FAILURE" ||
          l.severity === "critical",
      )
      .slice(0, 10)
      .map((l: any) => ({
        type: l.type,
        userEmail: l.userEmail,
        ipAddress: l.ipAddress,
        timestamp: l.timestamp,
        severity: l.severity,
      }));

    const cacheStats = memoryCache.getStats();

    const analytics = {
      realtime: {
        activeUsersLast5Min: new Set(
          last5MinLogs
            .filter((l: any) => l.userEmail)
            .map((l: any) => l.userEmail),
        ).size,
        requestsLast5Min: last5MinLogs.length,
        requestsLastHour: last1HourLogs.length,
      },
      engagement: {
        uniqueUsersToday,
        uniqueUsersThisWeek,
        uniqueUsersThisMonth,
        totalActionsToday: totalActions,
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
    console.error("Failed to fetch enhanced analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data." },
      { status: 500 },
    );
  }
}
