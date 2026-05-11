"use client";

import React, { useState } from "react";
import {
  KeyRound,
  Search,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  UserCircle2,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useConfirm } from "@/components/providers/ModalProvider";

export default function UserPasswordManager() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    hasPassword: boolean;
    checked: boolean;
  } | null>(null);
  const { addToast } = useAppStore();
  const { confirm } = useConfirm();

  const handleCheck = async () => {
    if (!email.trim()) return;
    setIsChecking(true);
    try {
      const res = await fetch(
        `/api/admin/user-password?email=${encodeURIComponent(email)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setStatus({ hasPassword: data.hasPassword, checked: true });
      } else {
        throw new Error(data.error || "Failed to check password");
      }
    } catch (error: any) {
      addToast({ message: error.message, type: "error" });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast({
          message: `Password for ${email} has been set.`,
          type: "success",
        });
        setPassword("");
        handleCheck(); // Refresh status
      } else {
        throw new Error(data.error || "Failed to set password");
      }
    } catch (error: any) {
      addToast({ message: error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePassword = async () => {
    if (!email.trim()) return;
    if (
      await confirm(
        `Are you sure you want to remove the password for ${email}?`,
        {
          title: "Remove User Password",
          variant: "destructive",
        },
      )
    ) {
      setIsSubmitting(true);
      try {
        const res = await fetch(
          `/api/admin/user-password?email=${encodeURIComponent(email)}`,
          {
            method: "DELETE",
          },
        );
        const data = await res.json();
        if (res.ok) {
          addToast({
            message: `Password for ${email} removed.`,
            type: "success",
          });
          handleCheck(); // Refresh status
        } else {
          throw new Error(data.error || "Failed to remove password");
        }
      } catch (error: any) {
        addToast({ message: error.message, type: "error" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <KeyRound size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold">User Access Passwords</h3>
          <p className="text-sm text-muted-foreground">
            Manage individual passwords for user emails (overrides default auth
            if checked).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Search & Status */}
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">
              Check User Status
            </h4>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setStatus(null);
                  }}
                  placeholder="Enter user email..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                />
              </div>
              <button
                onClick={handleCheck}
                disabled={isChecking || !email.trim()}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isChecking ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                <span>Check</span>
              </button>
            </div>

            {status?.checked && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-6 p-4 rounded-xl border flex items-center justify-between",
                  status.hasPassword
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-amber-500/5 border-amber-500/20",
                )}
              >
                <div className="flex items-center gap-3">
                  {status.hasPassword ? (
                    <div className="p-2 bg-green-500/10 rounded-full text-green-600">
                      <ShieldCheck size={20} />
                    </div>
                  ) : (
                    <div className="p-2 bg-amber-500/10 rounded-full text-amber-600">
                      <ShieldAlert size={20} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold truncate max-w-[200px]">
                      {email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {status.hasPassword
                        ? "Individual password set"
                        : "No individual password"}
                    </p>
                  </div>
                </div>

                {status.hasPassword && (
                  <button
                    onClick={handleDeletePassword}
                    disabled={isSubmitting}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove Password"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right: Set/Update Password Form */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">
            Set / Update Password
          </h4>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground ml-1">
                Target User Email
              </label>
              <div className="relative">
                <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground ml-1">
                New Password (min 6 chars)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || password.length < 6}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ShieldCheck size={18} />
              )}
              <span>
                {status?.hasPassword ? "Update Password" : "Set Password"}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex gap-3 text-blue-600">
        <div className="shrink-0 pt-0.5">
          <CheckCircle2 size={16} />
        </div>
        <div className="text-xs space-y-1">
          <p className="font-bold">How it works:</p>
          <p>
            These passwords are used for users who are NOT in the default
            Admin/Editor list but need specific access. If a password is set for
            an email, the system will prompt for it during login or access
            verification.
          </p>
        </div>
      </div>
    </div>
  );
}
