"use client";

import { ShieldCheck, FolderLock, HardDrive } from "lucide-react";
import TwoFactorAuthSetup from "@/components/features/TwoFactorAuthSetup";
import ProtectedFoldersManager from "@/components/admin/ProtectedFoldersManager";
import SecurityConfig from "@/components/admin/SecurityConfig";
import UserFolderAccessManager from "@/components/admin/UserFolderAccessManager";
import ManualDrivesManager from "@/components/admin/ManualDrivesManager";
import SecurityCenter from "@/components/admin/SecurityCenter";
import ActiveLinksManager from "@/components/admin/ActiveLinksManager";
import { useTranslations } from "next-intl";

export default function AdminSecurityTab() {
  const t = useTranslations("AdminPage");

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <SecurityCenter />
      </section>

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
          <FolderLock className="text-amber-500" />
          <h3 className="text-lg font-bold">{t("protection")}</h3>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <ProtectedFoldersManager />
          </div>
          <div>
            <UserFolderAccessManager />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2 mb-4">
          <HardDrive className="text-blue-500" />
          <h3 className="text-lg font-bold">{t("sharedDrives")}</h3>
        </div>
        <ManualDrivesManager />
      </section>

      <ActiveLinksManager />
    </div>
  );
}
