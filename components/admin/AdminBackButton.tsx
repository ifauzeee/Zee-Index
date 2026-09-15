"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

export default function AdminBackButton() {
  const t = useTranslations("AdminPage");
  return (
    <a
      href="/admin"
      className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors text-sm border border-border shrink-0"
    >
      <ArrowLeft className="w-4 h-4" />
      {t("backToAdmin")}
    </a>
  );
}
