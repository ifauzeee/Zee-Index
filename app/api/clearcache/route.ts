import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target");
  if (target === "files") {
    revalidateTag("files", "max");
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
