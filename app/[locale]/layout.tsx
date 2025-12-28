import "@/lib/env";
import type { Metadata, Viewport } from "next";
import { Providers } from "../providers";
import "./(main)/globals.css";
import GlobalBranding from "@/components/layout/GlobalBranding";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";

export const preferredRegion = "sin1";

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: {
    default: "Zee Index - Google Drive Index",
    template: "%s | Zee Index",
  },
  description:
    "A modern, fast, and feature-rich Google Drive indexer built with Next.js. Stream, manage, and share your files effortlessly.",
  applicationName: "Zee Index",
  authors: [
    { name: "Muhammad Ibnu Fauzi", url: "https://ifauzeee.vercel.app" },
  ],
  generator: "Next.js",
  keywords: ["Google Drive", "Index", "File Manager", "Streaming", "Next.js"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zee Index",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Zee Index",
    title: "Zee Index - Ultimate Google Drive Manager",
    description:
      "Transform your Google Drive into a professional portfolio website, media gallery, or file repository.",
    images: [
      {
        url: "https://cdn-icons-png.freepik.com/512/2991/2991248.png",
        width: 512,
        height: 512,
        alt: "Zee Index Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Zee Index",
    description: "Your Google Drive, Supercharged.",
    images: ["https://cdn-icons-png.freepik.com/512/2991/2991248.png"],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!["en", "id"].includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head />
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <GlobalBranding />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
