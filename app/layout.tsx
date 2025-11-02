import type { Metadata } from "next";
import { Providers } from "./providers";
import "./(main)/globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "plyr/dist/plyr.css";
import ThemeInitializer from "@/components/ThemeInitializer";

export const metadata: Metadata = {
  title: "Zee Index - Google Drive Index",
  description:
    "A modern, fast, and feature-rich Google Drive indexer built with Next.js.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <ThemeInitializer />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}