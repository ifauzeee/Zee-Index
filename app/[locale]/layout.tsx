import type { Metadata, Viewport } from "next";
import { Providers } from "../providers";
import "./(main)/globals.css";
import "plyr/dist/plyr.css";
import GlobalBranding from "@/components/GlobalBranding";

export const preferredRegion = "sin1";

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
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";

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
