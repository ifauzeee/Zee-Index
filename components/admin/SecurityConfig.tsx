"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Loader2, EyeOff, UserX } from "lucide-react";
import { useTranslations } from "next-intl";

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

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    if (
      hideAuthor === null ||
      disableGuestLogin === null ||
      localStorageAuthEnabled === null
    ) {
      fetchConfig();
    }
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
          {isConfigLoading ? (
            <Loader2 className="animate-spin text-muted-foreground" />
          ) : (
            <input
              id="hideAuthor"
              type="checkbox"
              checked={hideAuthor || false}
              disabled={isConfigLoading}
              onChange={(e) => handleToggle("hideAuthor", e.target.checked)}
              className="ml-auto h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
            />
          )}
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
          {isConfigLoading ? (
            <Loader2 className="animate-spin text-muted-foreground" />
          ) : (
            <input
              id="disableGuestLogin"
              type="checkbox"
              checked={disableGuestLogin || false}
              disabled={isConfigLoading}
              onChange={(e) =>
                handleToggle("disableGuestLogin", e.target.checked)
              }
              className="ml-auto h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
            />
          )}
        </div>
      </div>
    </div>
  );
}
