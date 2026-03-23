"use client";

import React from "react";
import { Clock, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type TimeUnit = "s" | "m" | "h" | "d";

interface ShareSidebarProps {
  activeTab: "timed" | "session";
  setActiveTab: (tab: "timed" | "session") => void;
  itemName?: string;
  itemCount?: number;
  t: (key: string, params?: Record<string, number>) => string;
}

export function ShareSidebar({
  activeTab,
  setActiveTab,
  itemName,
  itemCount,
  t,
}: ShareSidebarProps) {
  return (
    <div className="w-full md:w-80 bg-accent/30 border-b md:border-b-0 md:border-r border-border/50 p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <Clock className="text-primary w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold leading-none">{t("share")}</h3>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
            {itemName || (itemCount ? `${itemCount} items` : "Collection")}
          </p>
        </div>
      </div>

      <div className="space-y-2 flex-grow">
        <button
          onClick={() => setActiveTab("timed")}
          className={cn(
            "w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group text-left",
            activeTab === "timed"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock
            size={20}
            className={cn(
              "transition-transform group-hover:scale-110",
              activeTab === "timed"
                ? "text-primary-foreground"
                : "text-primary",
            )}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{t("timedLink")}</span>
            <span className="text-[10px] opacity-70">Temporary access</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("session")}
          className={cn(
            "w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group text-left",
            activeTab === "session"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
          )}
        >
          <Zap
            size={20}
            className={cn(
              "transition-transform group-hover:scale-110",
              activeTab === "session"
                ? "text-primary-foreground"
                : "text-amber-400",
            )}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{t("sessionLink")}</span>
            <span className="text-[10px] opacity-70">Long-term access</span>
          </div>
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-border/50 text-[11px] text-muted-foreground leading-relaxed">
        By generating a link, you agree to track and monitor the link usage in
        the Admin Panel.
      </div>
    </div>
  );
}

interface SecurityPoliciesProps {
  loginRequired: boolean;
  setLoginRequired: (v: boolean) => void;
  preventDownload: boolean;
  setPreventDownload: (v: boolean) => void;
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

export function SecurityPolicies({
  loginRequired,
  setLoginRequired,
  preventDownload,
  setPreventDownload,
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
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-1">
        Security & Policies
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setLoginRequired(!loginRequired)}
          className={cn(
            "flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200",
            loginRequired
              ? "bg-primary/5 border-primary shadow-sm"
              : "bg-background hover:border-border/80 hover:bg-accent/20",
          )}
        >
          <ShieldCheck
            className={cn(
              "w-5 h-5",
              loginRequired ? "text-primary" : "text-muted-foreground",
            )}
          />
          <div className="flex-1">
            <p className="text-sm font-semibold">{t("requireLogin")}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              Protect with account
            </p>
          </div>
        </button>

        <button
          onClick={() => setPreventDownload(!preventDownload)}
          className={cn(
            "flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200",
            preventDownload
              ? "bg-primary/5 border-primary shadow-sm"
              : "bg-background hover:border-border/80 hover:bg-accent/20",
          )}
        >
          <ShieldCheck
            className={cn(
              "w-5 h-5",
              preventDownload ? "text-primary" : "text-muted-foreground",
            )}
          />
          <div className="flex-1">
            <p className="text-sm font-semibold">{t("preventDownload")}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              Restrict direct saving
            </p>
          </div>
        </button>

        <div
          className={cn(
            "flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-200",
            hasWatermark
              ? "bg-primary/5 border-primary shadow-sm"
              : "bg-background hover:border-border/80 hover:bg-accent/20",
          )}
        >
          <button
            onClick={() => setHasWatermark(!hasWatermark)}
            className="flex items-center gap-3 text-left w-full"
          >
            <ShieldCheck
              className={cn(
                "w-5 h-5",
                hasWatermark ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("hasWatermark")}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                Enable visual protection
              </p>
            </div>
          </button>
          {hasWatermark && (
            <motion.input
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              type="text"
              placeholder="Custom Watermark (optional)"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              className="w-full mt-1.5 px-3 py-1.5 rounded-lg border-2 border-primary/20 bg-background text-sm outline-none focus:border-primary/50"
            />
          )}
        </div>

        <div
          className={cn(
            "flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-200",
            useMaxUses
              ? "bg-primary/5 border-primary shadow-sm"
              : "bg-background",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck
                className={cn(
                  "w-5 h-5",
                  useMaxUses ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div className="flex flex-col">
                <p className="text-sm font-semibold">{t("limitAccess")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                  Max views/downloads
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={useMaxUses}
              onChange={(e) => setUseMaxUses(e.target.checked)}
              className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>
          {useMaxUses && (
            <motion.input
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              type="number"
              value={maxUses}
              autoFocus
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setMaxUses(isNaN(val) ? "" : val);
              }}
              className="w-full mt-1.5 px-3 py-1.5 rounded-lg border-2 border-primary/20 bg-background text-sm outline-none focus:border-primary/50"
              min="1"
            />
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 bg-accent/20 rounded-2xl border border-border/50"
    >
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        Duration Settings
      </h4>
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="number"
            value={customDuration}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setCustomDuration(isNaN(val) ? "" : val);
            }}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-transparent bg-background/50 focus:border-primary/50 focus:ring-0 transition-all outline-none"
            min="1"
          />
        </div>
        <div className="flex-[2]">
          <select
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value as TimeUnit)}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-transparent bg-background/50 focus:border-primary/50 focus:ring-0 transition-all outline-none"
          >
            <option value="s">{t("seconds")}</option>
            <option value="m">{t("minutes")}</option>
            <option value="h">{t("hours")}</option>
            <option value="d">{t("days")}</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
}
