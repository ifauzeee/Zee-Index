import ThemeInitializer from "@/components/ThemeInitializer";

export const metadata = {
  title: "Login - Zee Index",
  description: "Halaman login untuk mengakses Zee Index",
};
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <ThemeInitializer />
      </head>
      <body>{children}</body>
    </html>
  );
}
