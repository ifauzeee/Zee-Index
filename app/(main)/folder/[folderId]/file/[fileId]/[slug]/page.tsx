import { getFileDetailsFromDrive } from "@/lib/googleDrive";
import dynamic from "next/dynamic";
import Loading from "@/components/Loading";

const FileDetail = dynamic(() => import("@/components/FileDetail"), {
  ssr: false,
  loading: () => <Loading />,
});

const FileError = ({ message }: { message: string }) => (
  <div className="text-center py-20 text-muted-foreground">
    <h1 className="text-4xl font-bold">Gagal Memuat</h1>
    <p className="mt-4">{message}</p>
  </div>
);

export default async function FilePage({
  params,
}: {
  params: { fileId: string };
}) {
  let file = null;
  let error = null;

  try {
    file = await getFileDetailsFromDrive(params.fileId);
  } catch (err) {
    console.error("Fetch file details error:", err);
    error =
      "Terjadi masalah saat mengambil detail file. Periksa koneksi jaringan Anda atau coba lagi nanti.";
  }

  if (error) {
    return <FileError message={error} />;
  }

  if (!file) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <h1 className="text-4xl font-bold">File Tidak Ditemukan</h1>
        <p className="mt-4">
          File yang Anda cari tidak ada atau tidak dapat diakses.
        </p>
      </div>
    );
  }

  return <FileDetail file={file} />;
}
