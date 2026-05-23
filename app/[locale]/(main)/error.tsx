"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("MainError");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-4 p-8 text-center">
      <div className="rounded-full bg-red-100 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground max-w-[500px]">{t("message")}</p>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => reset()} variant="default" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t("tryAgain")}
        </Button>
      </div>

      {error.digest && (
        <p className="text-xs text-muted-foreground">
          {t("errorId")}: {error.digest}
        </p>
      )}
    </div>
  );
}
