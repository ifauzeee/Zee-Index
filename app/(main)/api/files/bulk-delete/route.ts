import { NextResponse, NextRequest } from "next/server";
import { getAccessToken } from "@/lib/googleDrive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";
import { logActivity } from "@/lib/activityLogger";

const deleteSchema = z.object({
  fileIds: z.array(z.string().min(1)),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = deleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { fileIds } = validation.data;
    const accessToken = await getAccessToken();

    const batch = fileIds.map((fileId) => {
      return fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    });

    const results = await Promise.all(batch);

    const failedDeletes = results.filter(
      (res) => !res.ok && res.status !== 204,
    );

    await logActivity("DELETE", {
      itemName: `${fileIds.length} files/folders`,
      userEmail: session?.user?.email,
      status: failedDeletes.length > 0 ? "failure" : "success",
      error:
        failedDeletes.length > 0
          ? `${failedDeletes.length} item gagal dihapus.`
          : undefined,
    });

    if (failedDeletes.length > 0) {
      console.error(`Gagal menghapus ${failedDeletes.length} item.`);
      return NextResponse.json(
        {
          success: false,
          message: `${fileIds.length - failedDeletes.length} item berhasil dihapus, ${failedDeletes.length} gagal.`,
        },
        { status: 207 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${fileIds.length} item berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error("Bulk Delete API Error:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error.", details: error.message },
      { status: 500 },
    );
  }
}
