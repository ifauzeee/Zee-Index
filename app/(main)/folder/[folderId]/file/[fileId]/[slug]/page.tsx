import { getFileDetailsFromDrive, listFilesFromDrive } from "@/lib/googleDrive";
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

const createSlug = (name: string) =>
  encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

export default async function FilePage({
  params,
}: {
  params: { folderId: string; fileId: string };
}) {
  let file = null;
  let error = null;

  let prevFileUrl: string | undefined = undefined;
  let nextFileUrl: string | undefined = undefined;

  try {
    file = await getFileDetailsFromDrive(params.fileId);

    if (file && params.folderId) {
      const { files: allFiles } = await listFilesFromDrive(
        params.folderId,
        null,
        1000,
      );

      const nonFolderFiles = allFiles.filter((f) => !f.isFolder);
      const currentIndex = nonFolderFiles.findIndex(
        (f) => f.id === params.fileId,
      );

      if (currentIndex > 0) {
        const prevFile = nonFolderFiles[currentIndex - 1];
        prevFileUrl = `/folder/${params.folderId}/file/${
          prevFile.id
        }/${createSlug(prevFile.name)}`;
      }

      if (currentIndex !== -1 && currentIndex < nonFolderFiles.length - 1) {
        const nextFile = nonFolderFiles[currentIndex + 1];
        nextFileUrl = `/folder/${params.folderId}/file/${
          nextFile.id
        }/${createSlug(nextFile.name)}`;
      }
    }
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

  return (
    <FileDetail
      file={file}
      prevFileUrl={prevFileUrl}
      nextFileUrl={nextFileUrl}
    />
  );
}