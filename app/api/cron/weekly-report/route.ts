import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createCronRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import { sendMail } from "@/lib/mailer";
import { formatBytes } from "@/lib/utils";
import { EVENT_PIPELINE_KEYS } from "@/lib/events/pipeline";

export const dynamic = "force-dynamic";

export const GET = createCronRoute(async () => {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const logs = await kv.zrange<unknown>(
      EVENT_PIPELINE_KEYS.activityLog,
      sevenDaysAgo,
      Date.now(),
      { byScore: true },
    );

    let uploadCount = 0;
    let downloadCount = 0;
    let totalUploadSize = 0;

    logs.forEach((entry) => {
      const log =
        typeof entry === "string"
          ? (JSON.parse(entry) as { type?: string; itemSize?: string | number })
          : (entry as { type?: string; itemSize?: string | number });

      if (log.type === "UPLOAD") {
        uploadCount++;
        totalUploadSize += Number(log.itemSize || 0);
      } else if (log.type === "DOWNLOAD") {
        downloadCount++;
      }
    });

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((email) =>
      email.trim(),
    );

    if (!adminEmails || adminEmails.length === 0) {
      return NextResponse.json({
        message: "Tidak ada admin untuk dikirimi laporan.",
      });
    }

    const reportHtml = `
        <h1>Laporan Aktivitas Mingguan Zee Index</h1>
        <p>Berikut adalah ringkasan aktivitas dalam 7 hari terakhir:</p>
        <ul>
            <li><b>Total File Diunggah:</b> ${uploadCount} file</li>
            <li><b>Total Ukuran Unggahan:</b> ${formatBytes(totalUploadSize)}</li>
            <li><b>Total File Diunduh:</b> ${downloadCount} file</li>
        </ul>
        <p>Laporan ini dibuat secara otomatis pada ${new Date().toLocaleString("id-ID")}.</p>
    `;

    await sendMail({
      to: adminEmails,
      subject: "Laporan Aktivitas Mingguan Zee Index",
      html: reportHtml,
    });

    return NextResponse.json({
      success: true,
      message: "Laporan mingguan berhasil dikirim.",
    });
  } catch (error: unknown) {
    logger.error(
      { err: error instanceof Error ? error.message : error },
      "Gagal membuat laporan mingguan",
    );
    return NextResponse.json(
      { error: "Gagal memproses laporan." },
      { status: 500 },
    );
  }
});
