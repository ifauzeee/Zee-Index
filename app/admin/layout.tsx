

import MainLayout from "@/app/(main)/layout";

export const metadata = {
  title: 'Admin Dashboard - Zee Index',
  description: 'Halaman manajemen untuk admin Zee Index.',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return <MainLayout>{children}</MainLayout>;
}