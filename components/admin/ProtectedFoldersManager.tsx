"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  CheckCircle,
  HardDrive,
  Loader2,
  Trash2,
  ShieldPlus,
  KeyRound,
  FolderInput,
  Lock,
  FolderKey,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { getErrorMessage } from "@/lib/errors";

interface ProtectedFolder {
  id: string;
  password: string;
}

export default function ProtectedFoldersManager() {
  const { addToast } = useAppStore();
  const t = useTranslations("ProtectedFoldersManager");
  const [folders, setFolders] = useState<Record<string, ProtectedFolder>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState({ folderId: "", password: "" });

  const fetchFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/protected-folders");
      if (!response.ok) throw new Error("Gagal mengambil data folder.");
      setFolders(await response.json());
    } catch (error: unknown) {
      addToast({ message: getErrorMessage(error), type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewFolder((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/protected-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newFolder, id: "admin" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      addToast({ message: result.message, type: "success" });
      setNewFolder({ folderId: "", password: "" });
      fetchFolders();
    } catch (error: unknown) {
      addToast({ message: getErrorMessage(error), type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!folderToDelete) return;
    try {
      const response = await fetch("/api/admin/protected-folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderToDelete }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      addToast({ message: result.message, type: "success" });
      fetchFolders();
    } catch (error: unknown) {
      addToast({ message: getErrorMessage(error), type: "error" });
    } finally {
      setFolderToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldPlus className="text-primary" /> {t("title")}
          </h2>
          <button
            type="button"
            onClick={() =>
              setNewFolder({ folderId: "local-storage:", password: "" })
            }
            className="text-xs font-semibold bg-blue-500/10 text-blue-600 px-3 py-1.5 rounded-full border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Lock size={12} /> {t("protectLocalRoot")}
          </button>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-8">
          <form onSubmit={handleAddFolder} className="space-y-6">
            <div className="flex flex-col gap-1">
              <h4 className="text-lg font-semibold">{t("addOrUpdate")}</h4>
              <p className="text-xs text-muted-foreground">
                {t("description")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium px-1">
                  {t("folderIdLabel")}
                </label>
                <div className="relative group">
                  <FolderInput className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    name="folderId"
                    value={newFolder.folderId}
                    onChange={handleInputChange}
                    placeholder={t("folderIdPlaceholder")}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background/50 focus:ring-2 focus:ring-primary focus:bg-background outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium px-1">
                  {t("passwordLabel")}
                </label>
                <div className="relative group">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    name="password"
                    type="password"
                    value={newFolder.password}
                    onChange={handleInputChange}
                    placeholder={t("passwordPlaceholder")}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background/50 focus:ring-2 focus:ring-primary focus:bg-background outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <ShieldPlus size={20} />
              )}
              <span>{isSubmitting ? t("saving") : t("saveProtection")}</span>
            </button>
          </form>

          <div className="border-t pt-8">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold">{t("protectedList")}</h4>
              <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">
                {t("folderCount", { count: Object.keys(folders).length })}
              </span>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="animate-spin text-primary" size={32} />
                <p className="text-sm text-muted-foreground animate-pulse">
                  {t("connecting")}
                </p>
              </div>
            ) : Object.keys(folders).length === 0 ? (
              <div className="text-center py-16 bg-muted/30 border border-dashed rounded-2xl">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                  <Lock size={24} />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {t("noProtected")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("emptyHint")}
                </p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {Object.entries(folders).map(([folderId]) => {
                  const isLocalStorage = folderId.startsWith("local-storage:");
                  return (
                    <motion.li
                      key={folderId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative overflow-hidden bg-card border rounded-2xl p-5 transition-all hover:shadow-xl hover:border-primary/50 flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div
                          className={`p-2.5 rounded-xl ${isLocalStorage ? "bg-blue-500/10 text-blue-600" : "bg-primary/10 text-primary"}`}
                        >
                          {isLocalStorage ? (
                            <HardDrive size={20} />
                          ) : (
                            <FolderKey size={20} />
                          )}
                        </div>
                        <button
                          onClick={() => setFolderToDelete(folderId)}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title={t("removeProtection")}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {isLocalStorage
                            ? t("localStorage")
                            : "Google Drive ID"}
                        </p>
                        <p className="font-mono text-sm font-semibold truncate leading-none">
                          {isLocalStorage
                            ? folderId.replace("local-storage:", "/")
                            : folderId}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-green-600 font-bold bg-green-500/10 w-fit px-3 py-1 rounded-full border border-green-500/20">
                          <CheckCircle size={10} /> {t("securelyLocked")}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {t("encrypted")}
                        </span>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {folderToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setFolderToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card border rounded-xl shadow-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {t("removeTitle")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("folder")}{" "}
                  <span className="font-mono bg-muted px-1 rounded">
                    {folderToDelete}
                  </span>{" "}
                  {t("removeMessage")}
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFolderToDelete(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border bg-background hover:bg-accent transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                >
                  {t("yesRemove")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
