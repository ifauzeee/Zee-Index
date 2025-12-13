import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { sendMail } from "@/lib/mailer";
import { kv } from "@/lib/kv";
import { logActivity } from "@/lib/activityLogger";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.isGuest) {
      return NextResponse.json(
        { error: "Fitur ini hanya untuk pengguna terdaftar." },
        { status: 403 },
      );
    }

    const { folderId, folderName } = await req.json();

    if (!folderId || !folderName) {
      return NextResponse.json(
        { error: "Folder ID dan Nama diperlukan." },
        { status: 400 },
      );
    }

    const requestData = {
      folderId,
      folderName,
      email: session.user.email,
      name: session.user.name,
      timestamp: Date.now(),
    };

    await kv.sadd("zee-index:access-requests:v3", JSON.stringify(requestData));

    const adminEmails = await kv.smembers("zee-index:admins");

    if (adminEmails && adminEmails.length > 0) {
      const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2>🔐 Permintaan Akses Baru</h2>
          <ul style="list-style: none; padding: 0;">
            <li><strong>User:</strong> ${session.user.email}</li>
            <li><strong>Folder:</strong> ${folderName}</li>
          </ul>
          <p>Buka Dashboard Admin untuk menyetujui.</p>
        </div>
      `;

      await sendMail({
        to: adminEmails,
        subject: `[Request Access] ${folderName}`,
        html: emailHtml,
      });
    }

    await logActivity("LOGIN_FAILURE", {
      itemName: folderName,
      userEmail: session.user.email,
      status: "failure",
      error: `REQUEST_ACCESS: Meminta akses ke folder ${folderId}`,
    });

    return NextResponse.json({
      success: true,
      message: "Permintaan akses dikirim ke Admin.",
    });
  } catch (error: any) {
    console.error("Request Access Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 },
    );
  }
}
