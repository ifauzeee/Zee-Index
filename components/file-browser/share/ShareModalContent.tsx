"use client";

import React from "react";
import {
  ShieldCheck,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type TimeUnit = "s" | "m" | "h" | "d";

interface SecurityPoliciesProps {
  loginRequired: boolean;
  setLoginRequired: (v: boolean) => void;
  preventDownload: boolean;
  setPreventDownload: (v: boolean) => void;
  directDownload: boolean;
  setDirectDownload: (v: boolean) => void;
  hasWatermark: boolean;
  setHasWatermark: (v: boolean) => void;
  watermarkText: string;
  setWatermarkText: (v: string) => void;
  useMaxUses: boolean;
  setUseMaxUses: (v: boolean) => void;
  maxUses: string | number;
  setMaxUses: (v: string | number) => void;
  t: (key: string) => string;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

export function SecurityPolicies({
  loginRequired,
  setLoginRequired,
  preventDownload,
  setPreventDownload,
  directDownload,
  setDirectDownload,
  hasWatermark,
  setHasWatermark,
  watermarkText,
  setWatermarkText,
  useMaxUses,
  setUseMaxUses,
  maxUses,
  setMaxUses,
  t,
}: SecurityPoliciesProps) {
  const policies = [
    {
      icon: ShieldCheck,
      label: t("requireLogin"),
      desc: t("protectWithAccount"),
      checked: loginRequired,
      onChange: () => setLoginRequired(!loginRequired),
    },
    {
      icon: EyeOff,
      label: t("preventDownload"),
      desc: t("restrictDirectSaving"),
      checked: preventDownload,
      onChange: () => setPreventDownload(!preventDownload),
    },
    {
      icon: Download,
      label: t("directDownload"),
      desc: t("directDownloadDesc"),
      checked: directDownload,
      onChange: () => setDirectDownload(!directDownload),
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {t("securityPolicies")}
      </h4>

      <div className="divide-y divide-border/50 rounded-lg border border-border/50">
        {policies.map((policy) => {
          const Icon = policy.icon;
          return (
            <button
              key={policy.label}
              type="button"
              onClick={policy.onChange}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  size={16}
                  className={cn(
                    "shrink-0",
                    policy.checked ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0">
                  <span className="text-sm font-medium">{policy.label}</span>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {policy.desc}
                  </span>
                </div>
              </div>
              <Toggle checked={policy.checked} onChange={policy.onChange} />
            </button>
          );
        })}

        {/* Watermark row */}
        <div className="px-3">
          <button
            type="button"
            onClick={() => setHasWatermark(!hasWatermark)}
            className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Fingerprint
                size={16}
                className={cn(
                  "shrink-0",
                  hasWatermark ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div className="min-w-0">
                <span className="text-sm font-medium">{t("hasWatermark")}</span>
                <span className="text-[11px] text-muted-foreground block truncate">
                  {t("enableVisualProtection")}
                </span>
              </div>
            </div>
            <Toggle
              checked={hasWatermark}
              onChange={() => setHasWatermark(!hasWatermark)}
            />
          </button>
          {hasWatermark && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pb-2.5"
            >
              <input
                type="text"
                placeholder={t("customWatermarkPlaceholder")}
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-border/50 bg-background text-sm outline-none focus:border-primary/50 transition-colors"
                autoFocus
              />
            </motion.div>
          )}
        </div>

        {/* Max uses row */}
        <div className="px-3">
          <button
            type="button"
            onClick={() => setUseMaxUses(!useMaxUses)}
            className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Hash
                size={16}
                className={cn(
                  "shrink-0",
                  useMaxUses ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div className="min-w-0">
                <span className="text-sm font-medium">{t("limitAccess")}</span>
                <span className="text-[11px] text-muted-foreground block truncate">
                  {t("maxViewsDownloads")}
                </span>
              </div>
            </div>
            <Toggle
              checked={useMaxUses}
              onChange={() => setUseMaxUses(!useMaxUses)}
            />
          </button>
          {useMaxUses && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pb-2.5"
            >
              <input
                type="number"
                value={maxUses}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMaxUses(isNaN(val) ? "" : val);
                }}
                className="w-full px-3 py-1.5 rounded-md border border-border/50 bg-background text-sm outline-none focus:border-primary/50 transition-colors"
                min="1"
                autoFocus
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DurationSettingsProps {
  customDuration: string | number;
  setCustomDuration: (v: string | number) => void;
  customUnit: TimeUnit;
  setCustomUnit: (v: TimeUnit) => void;
  t: (key: string) => string;
}

export function DurationSettings({
  customDuration,
  setCustomDuration,
  customUnit,
  setCustomUnit,
  t,
}: DurationSettingsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground shrink-0">
        {t("expiresIn")}
      </span>
      <input
        type="number"
        value={customDuration}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          setCustomDuration(isNaN(val) ? "" : val);
        }}
        className="w-16 px-2 py-1.5 rounded-md border border-border/50 bg-background text-sm outline-none focus:border-primary/50 transition-colors text-center"
        min="1"
      />
      <select
        value={customUnit}
        onChange={(e) => setCustomUnit(e.target.value as TimeUnit)}
        className="px-2 py-1.5 rounded-md border border-border/50 bg-background text-sm outline-none focus:border-primary/50 transition-colors"
      >
        <option value="s">{t("seconds")}</option>
        <option value="m">{t("minutes")}</option>
        <option value="h">{t("hours")}</option>
        <option value="d">{t("days")}</option>
      </select>
    </div>
  );
}
