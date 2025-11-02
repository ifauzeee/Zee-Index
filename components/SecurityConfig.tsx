"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Loader2, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SecurityConfig() {
  const {
    hideAuthor,
    isConfigLoading,
    fetchConfig,
    setConfig,
    addToast,
    user,
  } = useAppStore();

  useEffect(() => {
    if (hideAuthor === null) {
      fetchConfig();
    }
  }, [fetchConfig, hideAuthor]);

  if (user?.role !== "ADMIN") return null;

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { hideAuthor: e.target.checked };
    await setConfig(newConfig);
    addToast({
      message: "Pengaturan berhasil disimpan.",
      type: "success",
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">
        Pengaturan Tampilan & Privasi
      </h2>
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="hideAuthor"
            className="flex items-center gap-3 cursor-pointer"
          >
            <EyeOff className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Sembunyikan Author</p>
              <p className="text-sm text-muted-foreground">
                Sembunyikan info &quot;Pemilik&quot; dan &quot;Diubah oleh&quot;
                untuk pengguna non-Admin.
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
              onChange={handleToggle}
              className="ml-auto h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          )}
        </div>
      </div>
    </div>
  );
}
