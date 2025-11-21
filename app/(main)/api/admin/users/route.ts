import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import { z } from "zod";
import { sendMail } from "@/lib/mailer";

import { type Session } from "next-auth";

const ADMIN_EMAILS_KEY = "zee-index:admins";
const emailSchema = z.object({
  email: z.string().email("Format email tidak valid."),
});

async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const adminEmails = await kv.smembers(ADMIN_EMAILS_KEY);
    return NextResponse.json(adminEmails);
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar admin." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!(await isAdmin(session)) || !session?.user?.email) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = emailSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email } = validation.data;
    await kv.sadd(ADMIN_EMAILS_KEY, email);

    const adminWhoAdded = session.user.email;

    await sendMail({
      to: email,
      subject: "Anda Telah Dijadikan Admin di Zee Index",
      html: `
                <p>Halo ${email},</p>
                <p>Anda telah ditambahkan sebagai admin untuk aplikasi Zee Index oleh <b>${adminWhoAdded}</b>.</p>
                <p>Sekarang Anda memiliki akses ke fitur-fitur manajemen di dasbor admin.</p>
            `,
    });

    const allAdmins: string[] = await kv.smembers(ADMIN_EMAILS_KEY);
    const otherAdmins = allAdmins.filter(
      (adminEmail) => adminEmail !== email && adminEmail !== adminWhoAdded,
    );
    if (otherAdmins.length > 0) {
      await sendMail({
        to: otherAdmins,
        subject: "[Zee Index] Admin Baru Ditambahkan",
        html: `
                    <p>Halo Admin,</p>
                    <p>Pengguna dengan email <b>${email}</b> telah ditambahkan sebagai admin baru oleh <b>${adminWhoAdded}</b>.</p>
                `,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Email ${email} telah ditambahkan sebagai admin.`,
    });
  } catch (error) {
    console.error("Gagal menambahkan admin:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan admin." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = emailSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email } = validation.data;

    const admins: string[] = await kv.smembers(ADMIN_EMAILS_KEY);
    if (admins.length <= 1) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus satu-satunya admin yang tersisa." },
        { status: 400 },
      );
    }

    await kv.srem(ADMIN_EMAILS_KEY, email);
    return NextResponse.json({
      success: true,
      message: `Email ${email} telah dihapus dari daftar admin.`,
    });
  } catch (error) {
    console.error("Gagal menghapus admin:", error);
    return NextResponse.json(
      { error: "Gagal menghapus admin." },
      { status: 500 },
    );
  }
}
