import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { isLocale } from "@/lib/i18n-config";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  if (!locale || !isLocale(locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
