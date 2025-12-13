import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { sendMail } from "@/lib/mailer";
import { formatBytes } from "@/lib/utils";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const logs: string[] = await kv.zrange(
      "zee-index:activity-log",
      sevenDaysAgo,
      Date.now(),
      { byScore: true },
    );

    let uploadCount = 0;
    let downloadCount = 0;
    let totalUploadSize = 0;

    logs.forEach((logStr) => {
      const log = JSON.parse(logStr);
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
    console.error(
      "Gagal membuat laporan mingguan:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Gagal memproses laporan." },
      { status: 500 },
    );
  }
}
