"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import {
  Loader2,
  Palette,
  Type,
  Image as ImageIcon,
  Globe,
  Save,
  RotateCcw,
} from "lucide-react";
export default function BrandingConfig() {
  const {
    appName,
    logoUrl,
    faviconUrl,
    primaryColor,
    setConfig,
    isConfigLoading,
    fetchConfig,
    addToast,
  } = useAppStore();

  const [formState, setFormState] = useState({
    appName: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    setFormState({
      appName: appName || "Zee Index",
      logoUrl: logoUrl || "",
      faviconUrl: faviconUrl || "",
      primaryColor: primaryColor || "",
    });
  }, [appName, logoUrl, faviconUrl, primaryColor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetColor = () => {
    setFormState((prev) => ({ ...prev, primaryColor: "" }));
    addToast({
      message: "Warna di-reset ke default (Simpan untuk menerapkan)",
      type: "info",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await setConfig(formState);
    addToast({ message: "Branding berhasil disimpan!", type: "success" });
    setIsSubmitting(false);
  };

  if (isConfigLoading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">
        Custom Branding (White Label)
      </h2>
      <div className="bg-card border rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Type size={16} className="text-primary" /> Nama Aplikasi
            </label>
            <input
              name="appName"
              value={formState.appName}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary outline-none"
              placeholder="Zee Index"
            />
            <p className="text-xs text-muted-foreground">
              Muncul di tab browser dan header.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Palette size={16} className="text-primary" /> Warna Utama
              (Primary Theme)
            </label>
            <div className="flex gap-4 items-center">
              <div className="relative">
                <input
                  type="color"
                  name="primaryColor"
                  value={formState.primaryColor || "#000000"}
                  onChange={handleChange}
                  className="h-10 w-20 cursor-pointer rounded border p-1 bg-background"
                />
              </div>
              <input
                type="text"
                name="primaryColor"
                value={formState.primaryColor}
                onChange={handleChange}
                className="flex-1 px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary outline-none uppercase"
                placeholder="Default (Kosong)"
              />
              <button
                type="button"
                onClick={handleResetColor}
                className="p-2.5 bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                title="Reset ke Default"
              >
                <RotateCcw size={18} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mengubah warna tombol, link aktif, dan aksen UI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon size={16} className="text-primary" /> Logo URL
                (Header)
              </label>
              <input
                name="logoUrl"
                value={formState.logoUrl}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary outline-none"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Format gambar (PNG/SVG). Kosongkan untuk default.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe size={16} className="text-primary" /> Favicon URL
              </label>
              <input
                name="faviconUrl"
                value={formState.faviconUrl}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary outline-none"
                placeholder="https://example.com/favicon.ico"
              />
              <p className="text-xs text-muted-foreground">Ikon tab browser.</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
