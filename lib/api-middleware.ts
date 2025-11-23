import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { type Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";

type AdminApiHandler = (
  req: NextRequest,
  context: { params?: unknown },
  session: Session,
) => Promise<NextResponse>;

export function withAdminSession(handler: AdminApiHandler) {
  return async (req: NextRequest, context: { params?: unknown }) => {
    try {
      const session = await getServerSession(authOptions);
      if (
        !session ||
        !session.user ||
        session.user.role !== "ADMIN" ||
        !session.user.email
      ) {
        return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
      }

      return await handler(req, context, session);
    } catch (error: unknown) {
      console.error(
        `[Admin Middleware Error] Gagal memproses ${req.url}:`,
        error,
      );
      return NextResponse.json(
        { error: "Terjadi kesalahan server internal." },
        { status: 500 },
      );
    }
  };
}
