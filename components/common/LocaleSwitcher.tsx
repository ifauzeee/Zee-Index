"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useTransition } from "react";
import { getLocaleDisplayCode, LOCALES } from "@/lib/i18n-config";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const currentIndex = LOCALES.indexOf(locale as any);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextLocale = LOCALES[(safeIndex + 1) % LOCALES.length];
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    const newPath = segments.join("/");

    startTransition(() => {
      router.replace(newPath);
    });
  };

  return (
    <button
      onClick={toggleLocale}
      disabled={isPending}
      className="p-2 rounded-lg hover:bg-accent relative text-muted-foreground hover:text-foreground"
      title={t("label")}
    >
      <Languages size={20} />
      <span className="absolute -bottom-1 -right-1 text-[10px] font-bold uppercase bg-background border rounded px-0.5 text-foreground leading-none">
        {getLocaleDisplayCode(locale)}
      </span>
    </button>
  );
}
