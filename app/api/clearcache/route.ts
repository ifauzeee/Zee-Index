import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async ({ request }) => {
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
});
