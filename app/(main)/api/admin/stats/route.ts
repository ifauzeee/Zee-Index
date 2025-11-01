import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import type { ActivityLog } from "@/lib/activityLogger";
import type {
  AdminStats,
  HourlyDownload,
  TopFile,
  DayOfWeekDownload,
} from "@/lib/adminStats";
import { format, startOfToday, subDays, getDay } from "date-fns";
import { id } from "date-fns/locale";

async function isAdmin(session: any): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const ninetyDaysAgo = subDays(new Date(), 90).getTime();

    // Mengubah nama variabel agar lebih jelas dan menggunakan tipe 'any[]'
    const logMembers: any[] = await kv.zrange(
      "zee-index:activity-log",
      ninetyDaysAgo,
      Date.now(),
      { byScore: true },
    );

    // --- AWAL PERBAIKAN LOGIKA PARSING ---
    const downloadLogs: ActivityLog[] = logMembers
      .map((logMember) => {
        try {
          // Logika parsing yang aman: cek jika sudah objek atau masih string
          return typeof logMember === "string"
            ? (JSON.parse(logMember) as ActivityLog)
            : (logMember as ActivityLog);
        } catch (e) {
          console.error("Gagal mem-parsing log statistik:", logMember, e);
          return null;
        }
      })
      // --- AKHIR PERBAIKAN LOGIKA PARSING ---
      .filter(
        (log): log is ActivityLog =>
          log !== null && log.type === "DOWNLOAD" && !!log.itemName,
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

    const downloadsByDayOfWeek: DayOfWeekDownload[] = [
      { name: "Min", downloads: 0 },
      { name: "Sen", downloads: 0 },
      { name: "Sel", downloads: 0 },
      { name: "Rab", downloads: 0 },
      { name: "Kam", downloads: 0 },
      { name: "Jum", downloads: 0 },
      { name: "Sab", downloads: 0 },
    ];

    for (const log of downloadLogs) {
      if (log.timestamp >= todayStart) {
        const hour = new Date(log.timestamp).getHours();
        downloadsToday[hour].downloads++;
      }

      if (log.timestamp >= sevenWeeksAgo) {
        const dayIndex = getDay(new Date(log.timestamp));
        downloadsByDayOfWeek[dayIndex].downloads++;
      }

      fileCounts.set(log.itemName!, (fileCounts.get(log.itemName!) || 0) + 1);
    }

    const topFiles: TopFile[] = Array.from(fileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const stats: AdminStats = {
      downloadsToday,
      topFiles,
      downloadsByDayOfWeek,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Gagal mengambil statistik admin:", error);
    return NextResponse.json(
      { error: "Gagal mengambil statistik." },
      { status: 500 },
    );
  }
}
