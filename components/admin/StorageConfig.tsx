"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Loader2, Cloud, HardDrive, Plug, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface StorageStatus {
  provider: string;
  isExternalEnabled: boolean;
  isS3Enabled: boolean;
  isWebDavEnabled: boolean;
  s3?: {
    endpoint: string;
    region: string;
    bucket: string;
    forcePathStyle: boolean;
    rootName: string;
  };
  webdav?: {
    url: string;
    username: string;
    basePath: string;
    rootName: string;
  };
}

interface TestResult {
  ok: boolean;
  provider?: string;
  error?: string;
  message?: string;
}

export default function StorageConfig() {
  const t = useTranslations("StorageConfig");
  const { user, addToast } = useAppStore();
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    fetch("/api/admin/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.storage) setStatus(data.storage);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role !== "ADMIN") return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/storage/test", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
      addToast({
        message: data.ok ? t("testSuccess") : t("testFailed"),
        type: data.ok ? "success" : "error",
      });
    } catch {
      setTestResult({ ok: false, error: t("testError") });
      addToast({ message: t("testError"), type: "error" });
    } finally {
      setTesting(false);
    }
  };

  if (loading || !status) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        <HardDrive className="h-8 w-8 text-blue-500" />
        <div>
          <p className="font-semibold">{t("title")}</p>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <ProviderBadge
          provider={status.provider}
          external={status.isExternalEnabled}
        />
      </div>

      {!status.isExternalEnabled && (
        <p className="text-sm text-muted-foreground rounded-md bg-muted px-3 py-2">
          {t("usingDefault")}
        </p>
      )}

      {status.s3 && (
        <ConfigTable
          icon={<Cloud className="h-5 w-5 text-muted-foreground" />}
          title={t("s3Title")}
          rows={[
            [t("endpoint"), status.s3.endpoint || "—"],
            [t("region"), status.s3.region || "—"],
            [t("bucket"), status.s3.bucket],
            [
              t("forcePathStyle"),
              status.s3.forcePathStyle ? t("yes") : t("no"),
            ],
            [t("rootName"), status.s3.rootName],
          ]}
        />
      )}

      {status.webdav && (
        <ConfigTable
          icon={<Cloud className="h-5 w-5 text-muted-foreground" />}
          title={t("webdavTitle")}
          rows={[
            [t("url"), status.webdav.url || "—"],
            [t("username"), status.webdav.username || "—"],
            [t("basePath"), status.webdav.basePath],
            [t("rootName"), status.webdav.rootName],
          ]}
        />
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={!status.isExternalEnabled || testing}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plug className="h-4 w-4" />
          )}
          {t("testConnection")}
        </button>

        {testResult && (
          <span
            className={
              testResult.ok
                ? "inline-flex items-center gap-1 text-sm text-green-600"
                : "inline-flex items-center gap-1 text-sm text-red-600"
            }
          >
            {testResult.ok ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {testResult.ok ? t("testOk") : testResult.error || t("testError")}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground border-t pt-3">
        {t("envHint")}
      </p>
    </div>
  );
}

function ProviderBadge({
  provider,
  external,
}: {
  provider: string;
  external: boolean;
}) {
  return (
    <span
      className={
        external
          ? "ml-auto rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium"
          : "ml-auto rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium"
      }
    >
      {provider}
    </span>
  );
}

function ConfigTable({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-md border divide-y divide-border">
      <div className="flex items-center gap-2 px-3 py-2 font-medium">
        {icon}
        {title}
      </div>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between px-3 py-1.5 text-sm"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono text-xs break-all max-w-[60%] text-right">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
