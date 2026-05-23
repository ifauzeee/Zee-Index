"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import idMessages from "@/messages/id.json";
import enMessages from "@/messages/en.json";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale =
    typeof navigator !== "undefined" && navigator.language.startsWith("id")
      ? "id"
      : "en";
  const messages =
    locale === "id" ? idMessages.GlobalError : enMessages.GlobalError;

  useEffect(() => {
    console.error("[GlobalError]", error);
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
            {messages.title}
          </h1>

          <p className="text-muted-foreground">{messages.message}</p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {messages.tryAgain}
            </button>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {messages.backHome}
            </Link>
          </div>

          {error.digest && (
            <p className="text-xs text-muted-foreground mt-4">
              {messages.errorId}: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
