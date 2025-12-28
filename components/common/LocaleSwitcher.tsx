"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useTransition } from "react";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "id" : "en";
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
        {locale}
      </span>
    </button>
  );
}
