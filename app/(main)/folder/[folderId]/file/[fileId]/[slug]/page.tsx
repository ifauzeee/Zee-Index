// app/(main)/folder/[folderId]/file/[fileId]/[slug]/page.tsx

import { getFileDetailsFromDrive } from "@/lib/googleDrive";
import dynamic from 'next/dynamic';
import Loading from '@/components/Loading';

const FileDetail = dynamic(() => import('@/components/FileDetail'), {
  ssr: false,
  loading: () => <Loading />,
});

export default async function FilePage({ params }: { params: { fileId: string } }) {
  const file = await getFileDetailsFromDrive(params.fileId);

  if (!file) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <h1 className="text-4xl font-bold">File Tidak Ditemukan</h1>
        <p className="mt-4">File yang Anda cari tidak ada atau tidak dapat diakses.</p>
      </div>
    );
  }

  // Kirim HANYA 'file' sebagai props. 'shareToken' sekarang diambil dari store global.
  return (
    <FileDetail file={file} />
  );
}