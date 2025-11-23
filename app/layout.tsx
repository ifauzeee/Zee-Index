import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./(main)/globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "plyr/dist/plyr.css";
import ThemeInitializer from "@/components/ThemeInitializer";

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Zee Index - Google Drive Index",
  description:
    "A modern, fast, and feature-rich Google Drive indexer built with Next.js.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zee Index",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <ThemeInitializer />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
