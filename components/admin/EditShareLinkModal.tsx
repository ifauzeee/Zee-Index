"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Edit, X, Loader2 } from "lucide-react";
import { useAppStore, ShareLink } from "@/lib/store";
import { useTranslations } from "next-intl";

interface EditShareLinkModalProps {
  link: ShareLink;
  onClose: () => void;
}

export default function EditShareLinkModal({
  link,
  onClose,
}: EditShareLinkModalProps) {
  const { updateShareLink, addToast } = useAppStore();
  const t = useTranslations("AdminPage");

  const [editLoginRequired, setEditLoginRequired] = useState(
    link.loginRequired,
  );
  const [editMaxUses, setEditMaxUses] = useState<number | "">(
    link.maxUses ?? "",
  );
  const [editPreventDownload, setEditPreventDownload] = useState(
    link.preventDownload || false,
  );
  const [editHasWatermark, setEditHasWatermark] = useState(
    link.hasWatermark || false,
  );
  const [editWatermarkText, setEditWatermarkText] = useState(
    link.watermarkText || "",
  );
  const [editExpiresAt, setEditExpiresAt] = useState(() => {
    if (link.expiresAt) {
      const date = new Date(link.expiresAt);
      const pad = (num: number) => String(num).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    return "";
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleSaveEditedShare = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSavingEdit(true);
    try {
      const payload: {
        loginRequired: boolean;
        maxUses: number | null;
        preventDownload: boolean;
        hasWatermark: boolean;
        watermarkText: string | null;
        expiresAt?: string;
      } = {
        loginRequired: editLoginRequired,
        maxUses: editMaxUses === "" ? null : Number(editMaxUses),
        preventDownload: editPreventDownload,
        hasWatermark: editHasWatermark,
        watermarkText: editHasWatermark ? editWatermarkText : null,
      };

      if (editExpiresAt) {
        payload.expiresAt = new Date(editExpiresAt).toISOString();
      }

      const response = await fetch(`/api/share/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal memperbarui tautan berbagi.");
      }

      updateShareLink(result.updatedShareLink);
      addToast({
        message: "Pengaturan tautan berhasil diperbarui.",
        type: "success",
      });
      onClose();
    } catch (err: unknown) {
      addToast({
        message:
          err instanceof Error
            ? err.message
            : "Gagal memperbarui tautan berbagi.",
        type: "error",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Edit size={18} className="text-primary" />
            {t("editShareLink")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSaveEditedShare}
          className="p-6 space-y-4 overflow-y-auto max-h-[70vh]"
        >
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              {t("itemNameReadonly")}
            </label>
            <input
              type="text"
              readOnly
              value={link.itemName}
              className="w-full px-3 py-2 bg-muted/50 border rounded-lg text-sm text-muted-foreground outline-none cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
            <div className="space-y-0.5">
              <label
                htmlFor="edit-login-required"
                className="text-sm font-semibold text-foreground cursor-pointer"
              >
                {t("requireLogin")}
              </label>
              <p className="text-xs text-muted-foreground">
                {t("requireLoginDesc")}
              </p>
            </div>
            <input
              id="edit-login-required"
              type="checkbox"
              checked={editLoginRequired}
              onChange={(e) => setEditLoginRequired(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
            <div className="space-y-0.5">
              <label
                htmlFor="edit-prevent-download"
                className="text-sm font-semibold text-foreground cursor-pointer"
              >
                {t("preventDownload")}
              </label>
              <p className="text-xs text-muted-foreground">
                {t("preventDownloadDesc")}
              </p>
            </div>
            <input
              id="edit-prevent-download"
              type="checkbox"
              checked={editPreventDownload}
              onChange={(e) => setEditPreventDownload(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg border bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor="edit-has-watermark"
                  className="text-sm font-semibold text-foreground cursor-pointer"
                >
                  {t("useWatermark")}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("useWatermarkDesc")}
                </p>
              </div>
              <input
                id="edit-has-watermark"
                type="checkbox"
                checked={editHasWatermark}
                onChange={(e) => setEditHasWatermark(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {editHasWatermark && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label
                  htmlFor="edit-watermark-text"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
                >
                  {t("watermarkText")}
                </label>
                <input
                  id="edit-watermark-text"
                  type="text"
                  value={editWatermarkText}
                  onChange={(e) => setEditWatermarkText(e.target.value)}
                  placeholder={t("watermarkPlaceholder")}
                  required
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-max-uses"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
            >
              {t("maxAccess")}
            </label>
            <input
              id="edit-max-uses"
              type="number"
              min="1"
              value={editMaxUses}
              onChange={(e) =>
                setEditMaxUses(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              placeholder={t("unlimited")}
              className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="edit-expires-at"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
            >
              {t("newExpiration")}
            </label>
            <input
              id="edit-expires-at"
              type="datetime-local"
              value={editExpiresAt}
              onChange={(e) => setEditExpiresAt(e.target.value)}
              required
              className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-muted text-sm font-medium transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingEdit && <Loader2 className="animate-spin" size={16} />}
              {t("saveChanges")}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
