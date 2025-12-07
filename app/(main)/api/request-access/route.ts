import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { sendMail } from "@/lib/mailer";
import { kv } from "@vercel/kv";
import { logActivity } from "@/lib/activityLogger";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.isGuest) {
      return NextResponse.json(
        { error: "Fitur ini hanya untuk pengguna terdaftar." },
        { status: 403 }
      );
    }

    const { folderId, folderName } = await req.json();

    if (!folderId || !folderName) {
      return NextResponse.json(
        { error: "Folder ID dan Nama diperlukan." },
        { status: 400 }
      );
    }

    const adminEmails = await kv.smembers("zee-index:admins");

    if (!adminEmails || adminEmails.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada admin yang terkonfigurasi." },
        { status: 404 }
      );
    }

    const requesterEmail = session.user.email;
    const requesterName = session.user.name || requesterEmail;

    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2>🔐 Permintaan Akses Folder</h2>
        <p>Seorang pengguna meminta akses ke folder terkunci.</p>
        <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 10px;"><strong>Pengguna:</strong> ${requesterName} (${requesterEmail})</li>
          <li style="margin-bottom: 10px;"><strong>Folder:</strong> ${folderName}</li>
          <li style="margin-bottom: 10px;"><strong>ID Folder:</strong> ${folderId}</li>
        </ul>
        <p>Buka <strong>Admin Dashboard</strong> untuk mengelola akses atau berikan password secara manual.</p>
      </div>
    `;

    await sendMail({
      to: adminEmails,
      subject: `[Request Access] ${folderName} - oleh ${requesterName}`,
      html: emailHtml,
    });

    await logActivity("LOGIN_FAILURE", {
      itemName: folderName,
      userEmail: requesterEmail,
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
      { status: 500 }
    );
  }
}