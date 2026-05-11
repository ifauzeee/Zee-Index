import { getTranslations } from "next-intl/server";
import { Verify2FAClient } from "./client";
import { setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: "Auth" });

  return {
    title: t("verify2faTitle", { fallback: "Verifikasi 2FA" }),
  };
}

export default async function Verify2FAPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <Verify2FAClient />
      </div>
    </div>
  );
}
