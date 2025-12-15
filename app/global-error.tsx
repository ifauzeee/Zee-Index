"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-background text-foreground min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="w-12 h-12" />
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Terjadi Kesalahan Fatal
          </h1>

          <p className="text-muted-foreground">
            Maaf, aplikasi mengalami kesalahan sistem yang tidak terduga. Tim
            kami telah dinotifikasi tentang masalah ini.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              Coba Lagi
            </button>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              Kembali ke Beranda
            </Link>
          </div>

          {error.digest && (
            <p className="text-xs text-muted-foreground mt-4">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
