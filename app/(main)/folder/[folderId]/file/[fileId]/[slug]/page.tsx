// app/(main)/folder/[folderid]/file/[fileid]/[slug]/page.tsx
import { getFileDetailsFromDrive } from "@/lib/googleDrive";
import dynamic from 'next/dynamic';
import Loading from '@/components/Loading';

const FileDetail = dynamic(() => import('@/components/FileDetail'), {
  ssr: false,
  loading: () => <Loading />,
});

export default async function FilePage({ params }: { params: { fileId: string } }) {
  // PENGAMBILAN DATA DI SERVER: Kode ini sudah benar dan efisien.
  // Data file diambil di server saat halaman pertama kali di-render,
  // lalu diteruskan ke komponen klien <FileDetail />.
  const file = await getFileDetailsFromDrive(params.fileId);

  if (!file) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <h1 className="text-4xl font-bold">File Tidak Ditemukan</h1>
        <p className="mt-4">File yang Anda cari tidak ada atau tidak dapat diakses.</p>
      </div>
    );
  }

  return (
    <FileDetail file={file} />
  );
}