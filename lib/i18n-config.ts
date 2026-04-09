export const LOCALES = ["en", "id", "zh-TW"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export function isLocale(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getLocaleDisplayCode(locale: string): string {
  return locale === "zh-TW" ? "zh" : locale;
}

export function stripLocaleFromPathname(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`))
      return pathname.slice(locale.length + 1);
  }
  return pathname;
}
