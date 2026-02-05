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
        return NextResponse.json(
          { error: "Akses ditolak. Perlu akses ADMIN." },
          { status: 403 },
        );
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

export function withEditorSession(handler: AdminApiHandler) {
  return async (req: NextRequest, context: { params?: unknown }) => {
    try {
      const session = await getServerSession(authOptions);
      const userRole = session?.user?.role as string;
      const isAuthorized = userRole === "ADMIN" || userRole === "EDITOR";

      if (!session || !session.user || !isAuthorized || !session.user.email) {
        return NextResponse.json(
          { error: "Akses ditolak. Perlu akses EDITOR atau ADMIN." },
          { status: 403 },
        );
      }

      return await handler(req, context, session);
    } catch (error: unknown) {
      console.error(
        `[Editor Middleware Error] Gagal memproses ${req.url}:`,
        error,
      );
      return NextResponse.json(
        { error: "Terjadi kesalahan server internal." },
        { status: 500 },
      );
    }
  };
}
