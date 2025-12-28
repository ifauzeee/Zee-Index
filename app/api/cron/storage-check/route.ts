import { NextResponse } from "next/server";
import { getStorageDetails } from "@/lib/drive";
import { sendMail } from "@/lib/mailer";
import { formatBytes } from "@/lib/utils";
import { kv } from "@/lib/kv";

const WARNING_SENT_KEY = "zee-index:storage-warning-sent";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const threshold = parseFloat(
      process.env.STORAGE_WARNING_THRESHOLD || "0.90",
    );
    const details = await getStorageDetails();
    const usagePercentage = details.usage / details.limit;

    if (usagePercentage > threshold) {
      const warningSentTimestamp = await kv.get(WARNING_SENT_KEY);
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      if (warningSentTimestamp && Number(warningSentTimestamp) > sevenDaysAgo) {
        return NextResponse.json({
          message: "Peringatan sudah dikirim baru-baru ini.",
        });
      }

      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((email) =>
        email.trim(),
      );
      if (!adminEmails || adminEmails.length === 0) {
        throw new Error("Tidak ada admin untuk dikirimi peringatan.");
      }

      const warningHtml = `
        <h1>⚠️ Peringatan Kapasitas Penyimpanan Zee Index</h1>
        <p>Penyimpanan Google Drive Anda hampir penuh!</p>
        <ul>
            <li><b>Kapasitas Terpakai:</b> ${formatBytes(details.usage)} (${(usagePercentage * 100).toFixed(2)}%)</li>
            <li><b>Batas Kapasitas:</b> ${formatBytes(details.limit)}</li>
        </ul>
        <p>Disarankan untuk membersihkan file yang tidak diperlukan untuk menghindari masalah di kemudian hari.</p>
      `;

      await sendMail({
        to: adminEmails,
        subject: "⚠️ Peringatan: Penyimpanan Google Drive Hampir Penuh",
        html: warningHtml,
      });

      await kv.set(WARNING_SENT_KEY, Date.now());

      return NextResponse.json({
        success: true,
        message: "Peringatan kapasitas terkirim.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Kapasitas penyimpanan masih aman.",
    });
  } catch (error: unknown) {
    console.error(
      "Gagal memeriksa penyimpanan:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Gagal memproses pemeriksaan penyimpanan." },
      { status: 500 },
    );
  }
}
