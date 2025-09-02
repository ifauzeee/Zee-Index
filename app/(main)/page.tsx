// app/(main)/page.tsx
import dynamic from 'next/dynamic';
import Loading from '@/components/Loading';

const FileBrowser = dynamic(() => import("@/components/FileBrowser"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function HomePage() {
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID || 'root';
  return <FileBrowser initialFolderId={rootFolderId} />;
}