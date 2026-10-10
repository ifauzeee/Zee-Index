"use server";

import { getVerifiedSession } from "@/lib/verified-session";
import { db } from "@/lib/db";
import { mapDbActivityLog } from "@/lib/activityLogger";
import type { ActivityLog } from "@/lib/activityLogger";
import { getStorageDetails } from "@/lib/drive";

export interface DashboardData {
  recentActivity: ActivityLog[];
  downloadCount: number;
  storageUsage: string;
}

export async function getDashboardData(): Promise<DashboardData> {
  const session = await getVerifiedSession();
  const userEmail = session?.user?.email;

  const [activityLogs, storageDetails] = await Promise.all([
    userEmail
      ? db.activityLog.findMany({
          where: { userEmail },
          orderBy: { timestamp: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    getStorageDetails(),
  ]);

  const recentActivity = activityLogs.map(mapDbActivityLog);
  const downloadCount = activityLogs.filter(
    (l) => l.type === "DOWNLOAD",
  ).length;

  const usageBytes = storageDetails.usage;
  const usageGb = usageBytes / (1024 * 1024 * 1024);
  const storageUsage =
    usageGb >= 1
      ? `${usageGb.toFixed(1)} GB`
      : `${(usageBytes / (1024 * 1024)).toFixed(0)} MB`;

  return {
    recentActivity,
    downloadCount,
    storageUsage,
  };
}
