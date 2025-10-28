import MainLayout from "@/app/(main)/layout";

export const metadata = {
  title: "Log Aktivitas - Admin Zee Index",
  description: "Lihat dan kelola log aktivitas sistem.",
};

export default function LogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
