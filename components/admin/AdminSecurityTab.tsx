"use client";

import { ShieldCheck, HardDrive, Clock } from "lucide-react";
import TwoFactorAuthSetup from "@/components/features/TwoFactorAuthSetup";
import SecurityConfig from "@/components/admin/SecurityConfig";
import StorageConfig from "@/components/admin/StorageConfig";
import UserFolderAccessManager from "@/components/admin/UserFolderAccessManager";
import ManualDrivesManager from "@/components/admin/ManualDrivesManager";
import ActiveLinksManager from "@/components/admin/ActiveLinksManager";
import { useTranslations } from "next-intl";
import { RATE_LIMITS } from "@/lib/constants";

export default function AdminSecurityTab() {
  const t = useTranslations("AdminPage");

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2 mb-4">
          <ShieldCheck className="text-primary" />
          <h3 className="text-lg font-bold">{t("basicConfig")}</h3>
        </div>
        <SecurityConfig />
        <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
          <h4 className="text-base font-semibold mb-4">{t("twoFactor")}</h4>
          <TwoFactorAuthSetup />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2 mb-4">
          <ShieldCheck className="text-amber-500" />
          <h3 className="text-lg font-bold">{t("protection")}</h3>
        </div>

        <div>
          <UserFolderAccessManager />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2 mb-4">
          <HardDrive className="text-blue-500" />
          <h3 className="text-lg font-bold">{t("sharedDrives")}</h3>
        </div>
        <ManualDrivesManager />
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2 mb-4">
          <HardDrive className="text-blue-500" />
          <h3 className="text-lg font-bold">{t("storage")}</h3>
        </div>
        <StorageConfig />
      </section>

      <ActiveLinksManager />

      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2 mb-4">
          <Clock className="text-orange-500" />
          <h3 className="text-lg font-bold">{t("rateLimits")}</h3>
        </div>
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-5 py-3">{t("rateLimitTier")}</th>
                <th className="px-5 py-3">{t("rateLimitMax")}</th>
                <th className="px-5 py-3">{t("rateLimitWindow")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(RATE_LIMITS).map(([tier, config]) => (
                <tr key={tier} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3 font-medium">{tier}</td>
                  <td className="px-5 py-3 tabular-nums">
                    {config.LIMIT.toLocaleString()} req
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {config.WINDOW >= 3600
                      ? `${config.WINDOW / 3600}h`
                      : `${config.WINDOW / 60}min`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
