import { NextResponse, NextRequest } from "next/server";
import { getAccessToken } from "@/lib/googleDrive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";
import { logActivity } from "@/lib/activityLogger";

const moveSchema = z.object({
  fileIds: z.array(z.string().min(1)),
  currentParentId: z.string().min(1),
  newParentId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = moveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { fileIds, currentParentId, newParentId } = validation.data;
    if (currentParentId === newParentId) {
      return NextResponse.json({
        success: true,
        message: "Folder tujuan sama dengan folder saat ini.",
      });
    }

    const accessToken = await getAccessToken();

    const batch = fileIds.map((fileId) => {
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&removeParents=${currentParentId}`;
      return fetch(driveUrl, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    });

    const results = await Promise.all(batch);
    const failedMoves = results.filter((res) => !res.ok);

    await logActivity("MOVE", {
      itemName: `${fileIds.length} files/folders`,
      userEmail: session.user.email,
      destinationFolder: newParentId,
      status: failedMoves.length > 0 ? "failure" : "success",
      error:
        failedMoves.length > 0
          ? `${failedMoves.length} item gagal dipindahkan.`
          : undefined,
    });

    if (failedMoves.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${fileIds.length - failedMoves.length} item berhasil dipindahkan, ${failedMoves.length} gagal.`,
        },
        { status: 207 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${fileIds.length} item berhasil dipindahkan.`,
    });
  } catch (error: any) {
    console.error("Bulk Move API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error." },
      { status: 500 },
    );
  }
}
