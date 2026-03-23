export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import { sendMail } from "@/lib/mailer";
import { kv } from "@/lib/kv";
import { logActivity } from "@/lib/activityLogger";
import { REDIS_KEYS } from "@/lib/constants";
import {
  accessRequestCreateSchema,
  serializeAccessRequestRecord,
} from "@/lib/link-payloads";

export const POST = createUserRoute(async ({ request, session }) => {
  try {
    if (!session.user || session.user.isGuest) {
      return NextResponse.json(
        { error: "Fitur ini hanya untuk pengguna terdaftar." },
        { status: 403 },
      );
    }

    if (!session.user.email) {
      return NextResponse.json(
        { error: "Email pengguna tidak tersedia." },
        { status: 400 },
      );
    }

    const parsedBody = accessRequestCreateSchema.safeParse(
      await request.json(),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Folder ID dan Nama diperlukan." },
        { status: 400 },
      );
    }

    const { folderId, folderName } = parsedBody.data;
    const requestData = serializeAccessRequestRecord({
      folderId,
      folderName,
      email: session.user.email,
      name: session.user.name,
      timestamp: Date.now(),
    });

    await kv.sadd(REDIS_KEYS.ACCESS_REQUESTS, requestData);

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
      itemId: folderId,
      userEmail: session.user.email,
      status: "failure",
      error: `REQUEST_ACCESS: Meminta akses ke folder ${folderId}`,
      metadata: {
        reason: "request_access",
        requestedFolderId: folderId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Permintaan akses dikirim ke Admin.",
    });
  } catch (error: unknown) {
    console.error("Request Access Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 },
    );
  }
});
