import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
// getAccessToken dihapus, getFileDetailsFromDrive ditambahkan kembali
import { DriveFile, getFileDetailsFromDrive } from "@/lib/googleDrive";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const userFavoritesKey = `user:${session.user.email}:favorites`;
    const favoriteIds: string[] = await kv.smembers(userFavoritesKey);
    const validFavoriteIds = favoriteIds.filter((id) => id);

    if (validFavoriteIds.length === 0) {
      return NextResponse.json([]);
    }

    // --- DIKEMBALIKAN KE FETCH INDIVIDUAL ---
    // Mengambil detail setiap file secara paralel menggunakan Promise.all.
    const detailPromises = validFavoriteIds.map((id) =>
      getFileDetailsFromDrive(id),
    );

    const results = await Promise.all(detailPromises);

    // Memfilter file:
    // - Menghapus hasil yang null (gagal diambil dari Drive).
    // - Menghapus file yang properti 'trashed'-nya bernilai true (ada di sampah).
    const allFiles: DriveFile[] = results.filter(
      (file): file is DriveFile => file !== null && !file.trashed,
    );
    // --- AKHIR PERUBAHAN ---

    const validFiles = allFiles.map((file) => ({
      ...file,
      // Memastikan properti 'isFolder' berdasarkan mimeType
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
    }));

    return NextResponse.json(validFiles);
  } catch (error: any) {
    console.error("Get Favorites API Error:", error);
    // Kirim pesan error yang lebih spesifik jika memungkinkan
    return NextResponse.json(
      { error: error.message || "Internal Server Error." },
      { status: 500 },
    );
  }
}
