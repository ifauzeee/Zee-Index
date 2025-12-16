import { NextResponse, NextRequest } from "next/server";
import { updateFileContent } from "@/lib/googleDrive";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya admin yang dapat mengedit file." },
      { status: 403 },
    );
  }

  try {
    const { fileId, content } = await request.json();

    if (!fileId || typeof content !== "string") {
      return NextResponse.json(
        { error: "fileId dan content diperlukan." },
        { status: 400 },
      );
    }

    const result = await updateFileContent(fileId, content);

    return NextResponse.json({ success: true, file: result });
  } catch (error: unknown) {
    console.error("Update API Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal memperbarui file.",
      },
      { status: 500 },
    );
  }
}
