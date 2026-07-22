"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Loader2, EyeOff, UserX, Bell } from "lucide-react";
import { FormSkeleton } from "@/components/admin/skeletons";
import { useTranslations } from "next-intl";

interface NotificationStatus {
  discord: boolean;
  telegram: boolean;
}

export default function SecurityConfig() {
  const t = useTranslations("SecurityConfig");
  const {
    hideAuthor,
    disableGuestLogin,
    localStorageAuthEnabled,
    isConfigLoading,
    fetchConfig,
    setConfig,
    addToast,
    user,
  } = useAppStore();
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus | null>(null);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    if (
      hideAuthor === null ||
      disableGuestLogin === null ||
      localStorageAuthEnabled === null
    ) {
      fetchConfig();
    }
    fetch("/api/admin/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.notifications) setNotificationStatus(data.notifications);
      })
      .catch(() => {});
  }, [
    fetchConfig,
    hideAuthor,
    disableGuestLogin,
    localStorageAuthEnabled,
    user,
  ]);

  if (user?.role !== "ADMIN") return null;

  const handleToggle = async (
    key: "hideAuthor" | "disableGuestLogin" | "localStorageAuthEnabled",
    value: boolean,
  ) => {
    try {
      await setConfig({ [key]: value });
      addToast({
        message: t("saveSuccess", {
          setting: key,
          status: value ? t("enabled") : t("disabled"),
        }),
        type: "success",
      });
    } catch {
      addToast({
        message: t("saveFailed"),
        type: "error",
      });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">{t("title")}</h2>
      {isConfigLoading ? (
        <FormSkeleton fields={4} />
      ) : (
        <div className="bg-card border rounded-lg p-6 space-y-4 divide-y divide-border">
          <div className="flex items-center justify-between pt-4 first:pt-0">
            <label
              htmlFor="hideAuthor"
              className="flex items-center gap-3 cursor-pointer"
            >
              <EyeOff className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-semibold">{t("hideAuthor")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("hideAuthorDesc")}
                </p>
              </div>
            </label>
            <input
              id="hideAuthor"
              type="checkbox"
              checked={hideAuthor || false}
              onChange={(e) => handleToggle("hideAuthor", e.target.checked)}
              className="ml-auto h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-4 first:pt-0">
            <label
              htmlFor="disableGuestLogin"
              className="flex items-center gap-3 cursor-pointer"
            >
              <UserX className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-semibold">{t("disableGuestLogin")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("disableGuestLoginDesc")}
                </p>
              </div>
            </label>
            <input
              id="disableGuestLogin"
              type="checkbox"
              checked={disableGuestLogin || false}
              onChange={(e) =>
                handleToggle("disableGuestLogin", e.target.checked)
              }
              className="ml-auto h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="pt-4 first:pt-0">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-semibold">{t("notificationsTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {notificationStatus ? (
                    <span className="inline-flex gap-2">
                      <ChannelBadge
                        label={t("discord")}
                        enabled={notificationStatus.discord}
                        notConfigured={t("notConfigured")}
                      />
                      <ChannelBadge
                        label={t("telegram")}
                        enabled={notificationStatus.telegram}
                        notConfigured={t("notConfigured")}
                      />
                    </span>
                  ) : (
                    t("notConfigured")
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelBadge({
  label,
  enabled,
  notConfigured,
}: {
  label: string;
  enabled: boolean;
  notConfigured: string;
}) {
  return (
    <span
      className={
        enabled
          ? "rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium"
          : "rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium"
      }
    >
      {label}: {enabled ? "✓" : notConfigured}
    </span>
  );
}
