// app/(main)/page.tsx
// Kode ini seharusnya menampilkan FileBrowser, bukan form login.
// Anda dapat mengadopsi kode dari 'components/FileBrowser.tsx'
// untuk menampilkannya di halaman ini.

import dynamic from 'next/dynamic';
import Loading from '@/components/Loading';

const FileBrowser = dynamic(() => import('@/components/FileBrowser'), {
  ssr: false,
  loading: () => <Loading />,
});

export default function Home() {
    return <FileBrowser />;
}