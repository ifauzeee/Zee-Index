import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target");
  if (target === "files") {
    revalidateTag("files");
    return NextResponse.json({
      success: true,
      message: "Cache files telah dibersihkan.",
    });
  }

  return NextResponse.json(
    { success: false, message: "Invalid cache target." },
    { status: 400 },
  );
}
