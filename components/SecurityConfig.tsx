"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Loader2, EyeOff, UserX } from "lucide-react";

export default function SecurityConfig() {
  const {
    hideAuthor,
    disableGuestLogin,
    isConfigLoading,
    fetchConfig,
    setConfig,
    addToast,
    user,
  } = useAppStore();

  useEffect(() => {
    if (hideAuthor === null || disableGuestLogin === null) {
      fetchConfig();
    }
  }, [fetchConfig, hideAuthor, disableGuestLogin]);

  if (user?.role !== "ADMIN") return null;

  const handleToggle = async (
    key: "hideAuthor" | "disableGuestLogin",
    value: boolean,
  ) => {
    await setConfig({ [key]: value });
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
      <div className="bg-card border rounded-lg p-6 space-y-4 divide-y divide-border">
        <div className="flex items-center justify-between pt-4 first:pt-0">
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
              onChange={(e) => handleToggle("hideAuthor", e.target.checked)}
              className="ml-auto h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
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
              <p className="font-semibold">Nonaktifkan Login Tamu</p>
              <p className="text-sm text-muted-foreground">
                Mencegah pengguna baru masuk sebagai &quot;Tamu&quot; di halaman
                login.
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
              onChange={(e) =>
                handleToggle("disableGuestLogin", e.target.checked)
              }
              className="ml-auto h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          )}
        </div>
      </div>
    </div>
  );
}
