"use client";

import React, { useState, useEffect, useMemo, FC } from "react";
import { useAppStore, ShareLink } from "@/lib/store";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  AlertCircle,
  Copy,
  Link as LinkIcon,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Hourglass,
  UserPlus,
  Loader2,
  Users,
  Eye,
} from "lucide-react";
import Loading from "@/components/Loading";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TwoFactorAuthSetup from "@/components/TwoFactorAuthSetup";
import ProtectedFoldersManager from "@/components/ProtectedFoldersManager";
import ActivityLogDashboard from "@/components/ActivityLogDashboard";

const DeleteConfirmationModal: FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm"
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      <div className="text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Hapus Tautan?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Tindakan ini akan membatalkan tautan secara permanen dan tidak dapat
          diurungkan. Anda yakin?
        </p>
      </div>
      <div className="mt-6 flex justify-center gap-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Ya, Hapus
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export default function AdminPage() {
  const {
    user,
    shareLinks,
    removeShareLink,
    addToast,
    fetchUser,
    fetchShareLinks,
    adminEmails,
    isFetchingAdmins,
    fetchAdminEmails,
    addAdminEmail,
    removeAdminEmail,
  } = useAppStore();
  const { status, data: session } = useSession();
  const router = useRouter();
  const [linkToDelete, setLinkToDelete] = useState<ShareLink | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      if (!user) {
        fetchUser();
      }
      fetchShareLinks();
      fetchAdminEmails();
    }
  }, [status, user, fetchUser, fetchShareLinks, fetchAdminEmails]);

  const { activeLinks, expiredLinks } = useMemo(() => {
    const now = new Date();
    const active: ShareLink[] = [];
    const expired: ShareLink[] = [];
    (shareLinks || []).forEach((link: ShareLink) => {
      if (new Date(link.expiresAt) > now) {
        active.push(link);
      } else {
        expired.push(link);
      }
    });
    return { activeLinks: active, expiredLinks: expired };
  }, [shareLinks]);

  const handleCopy = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl);
    addToast({ message: "Tautan disalin ke clipboard!", type: "success" });
  };

  const handleDeleteClick = (link: ShareLink) => {
    setLinkToDelete(link);
  };

  const confirmDelete = async () => {
    if (linkToDelete) {
      await removeShareLink(linkToDelete);
      setLinkToDelete(null);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setIsSubmittingAdmin(true);
    await addAdminEmail(newAdminEmail);
    setNewAdminEmail("");
    setIsSubmittingAdmin(false);
  };

  const handleRemoveAdmin = async (email: string) => {
    if (
      window.confirm(`Anda yakin ingin menghapus ${email} dari daftar admin?`)
    ) {
      await removeAdminEmail(email);
    }
  };

  if (status === "loading" || (status === "authenticated" && !user)) {
    return <Loading />;
  }

  if (user?.role !== "ADMIN" || status === "unauthenticated") {
    return (
      <div className="text-center py-20 text-red-500">
        <AlertCircle className="h-16 w-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="mt-2 text-muted-foreground">
          Anda tidak memiliki izin untuk melihat halaman ini.
        </p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto py-8"
      >
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>

        {}
        <div className="flex flex-col gap-8">
          {}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border rounded-lg p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <LinkIcon size={28} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tautan</p>
                <p className="text-2xl font-bold">{shareLinks.length}</p>
              </div>
            </div>
            <div className="bg-card border rounded-lg p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
                <Clock size={28} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tautan Aktif</p>
                <p className="text-2xl font-bold">{activeLinks.length}</p>
              </div>
            </div>
            <div className="bg-card border rounded-lg p-6 flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
                <Hourglass size={28} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Tautan Kedaluwarsa
                </p>
                <p className="text-2xl font-bold">{expiredLinks.length}</p>
              </div>
            </div>
            <div className="bg-card border rounded-lg p-6 flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-500">
                <Users size={28} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jumlah Admin</p>
                <p className="text-2xl font-bold">{adminEmails.length}</p>
              </div>
            </div>
          </div>

          {}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Pengaturan Keamanan</h2>
            <div className="bg-card border rounded-lg p-6">
              <TwoFactorAuthSetup />
            </div>
          </div>

          <ProtectedFoldersManager />

          <ActivityLogDashboard />

          {}
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Manajemen Tautan Berbagi
            </h2>
            {shareLinks.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground bg-card border rounded-lg">
                <AlertCircle className="h-16 w-16 mx-auto mb-4" />
                <p>Tidak ada tautan berbagi yang pernah dibuat.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {shareLinks.map((link: ShareLink) => {
                    const isExpired = new Date(link.expiresAt) < new Date();
                    return (
                      <motion.div
                        key={link.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{
                          opacity: 0,
                          scale: 0.95,
                          transition: { duration: 0.2 },
                        }}
                        className={cn(
                          "bg-card border rounded-lg p-4 transition-colors",
                          isExpired && "bg-muted/50 border-dashed",
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">
                              {link.itemName}
                            </p>
                            <a
                              href={`${window.location.origin}${link.path}?share_token=${link.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base font-semibold text-primary truncate block hover:underline"
                            >
                              {link.path}
                            </a>
                          </div>
                          <div className="flex items-center gap-4 mt-3 sm:mt-0">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                link.loginRequired
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                              )}
                            >
                              <ShieldCheck size={14} />
                              {link.loginRequired ? "Login" : "Publik"}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                isExpired
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
                              )}
                            >
                              <Clock size={14} />
                              {isExpired ? "Kedaluwarsa" : "Aktif"}
                            </span>
                          </div>
                        </div>
                        <div className="border-t my-4"></div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-muted-foreground mb-2 sm:mb-0 flex items-center flex-wrap gap-x-2 gap-y-1">
                            <span className="flex items-center gap-1.5">
                              <Clock size={12} />
                              Kedaluwarsa:{" "}
                              {format(
                                new Date(link.expiresAt),
                                "dd MMM yyyy, HH:mm",
                                { locale: id },
                              )}
                            </span>
                            <span className="hidden sm:inline text-gray-400 dark:text-gray-600">
                              |
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Eye size={12} />
                              Dilihat: {link.viewCount || 0} kali
                            </span>
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleCopy(
                                  `${window.location.origin}${link.path}?share_token=${link.token}`,
                                )
                              }
                              className="p-2 rounded-md hover:bg-accent"
                              title="Salin Tautan"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(link)}
                              className="p-2 rounded-md hover:bg-accent text-red-500"
                              title="Hapus & Batalkan Tautan"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Manajemen Admin</h2>
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <form onSubmit={handleAddAdmin}>
                <label
                  htmlFor="new-admin-email"
                  className="block text-sm font-medium mb-2"
                >
                  Tambah Admin Baru
                </label>
                <div className="flex gap-2">
                  <input
                    id="new-admin-email"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="flex-grow px-3 py-2 rounded-md border bg-transparent focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingAdmin}
                    className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50"
                  >
                    {isSubmittingAdmin ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <UserPlus />
                    )}
                  </button>
                </div>
              </form>
              <div className="border-t pt-4 mt-4">
                <h4 className="text-base font-medium mb-3">
                  Daftar Admin Saat Ini
                </h4>
                {isFetchingAdmins ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {(adminEmails || []).map((email: string) => (
                      <li
                        key={email}
                        className="flex justify-between items-center bg-accent/50 p-2 rounded-md"
                      >
                        <span className="text-sm truncate">{email}</span>
                        <button
                          onClick={() => handleRemoveAdmin(email)}
                          disabled={
                            session?.user?.email === email &&
                            adminEmails.length === 1
                          }
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded-full disabled:text-muted-foreground disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          // PERBAIKAN: Tambahkan title untuk umpan balik
                          title={
                            session?.user?.email === email &&
                            adminEmails.length === 1
                              ? "Tidak dapat menghapus diri sendiri sebagai admin terakhir."
                              : "Hapus admin"
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
        {}
      </motion.div>

      <AnimatePresence>
        {linkToDelete && (
          <DeleteConfirmationModal
            onCancel={() => setLinkToDelete(null)}
            onConfirm={confirmDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
}
