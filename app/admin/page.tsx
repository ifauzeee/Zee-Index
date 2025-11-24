"use client";
import React, { useState, useEffect, useMemo, FC } from "react";
import { useAppStore, ShareLink, FileRequestLink } from "@/lib/store";
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
  Activity,
  UploadCloud,
  Download,
  Menu,
  X,
} from "lucide-react";
import Loading from "@/components/Loading";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TwoFactorAuthSetup from "@/components/TwoFactorAuthSetup";
import ProtectedFoldersManager from "@/components/ProtectedFoldersManager";
import ActivityLogDashboard from "@/components/ActivityLogDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminStats } from "@/lib/adminStats";
import TodayDownloadsChart from "@/components/charts/TodayDownloadsChart";
import DayOfWeekChart from "@/components/charts/DayOfWeekChart";
import SecurityConfig from "@/components/SecurityConfig";
import UserFolderAccessManager from "@/components/UserFolderAccessManager";

const scrollbarHideStyles = {
  msOverflowStyle: "none" as const /* IE and Edge */,
  scrollbarWidth: "none" as const /* Firefox */,
};

const DeleteConfirmationModal: FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: 20 }}
      className="bg-card border rounded-xl shadow-2xl p-6 w-full max-w-sm"
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Hapus Tautan?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Tindakan ini akan membatalkan tautan secara permanen. Pengguna tidak
          akan bisa mengaksesnya lagi.
        </p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium rounded-lg border bg-background hover:bg-accent transition-colors"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
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
    fileRequests,
    fetchFileRequests,
    removeFileRequest,
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
  const [linkToDelete, setLinkToDelete] = useState<{
    type: "share" | "request";
    item: ShareLink | FileRequestLink;
  } | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      if (!user) {
        fetchUser();
      }
      fetchShareLinks();
      fetchFileRequests();
      fetchAdminEmails();

      setIsLoadingStats(true);
      fetch("/api/admin/stats")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setStats(data);
        })
        .catch((err) =>
          addToast({
            message: `Gagal memuat statistik: ${err.message}`,
            type: "error",
          }),
        )
        .finally(() => setIsLoadingStats(false));
    }
  }, [
    status,
    user,
    fetchUser,
    fetchShareLinks,
    fetchFileRequests,
    fetchAdminEmails,
    addToast,
  ]);

  const { expiredLinks } = useMemo(() => {
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ message: "Tautan disalin ke clipboard!", type: "success" });
  };

  const handleDeleteClick = (
    item: ShareLink | FileRequestLink,
    type: "share" | "request",
  ) => {
    setLinkToDelete({ type, item });
  };

  const confirmDelete = async () => {
    if (linkToDelete) {
      if (linkToDelete.type === "share") {
        await removeShareLink(linkToDelete.item as ShareLink);
      } else {
        await removeFileRequest((linkToDelete.item as FileRequestLink).token);
      }
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Akses Ditolak</h1>
        <p className="text-muted-foreground max-w-md">
          Anda tidak memiliki izin Administrator untuk melihat halaman ini.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const tabItems = [
    { value: "summary", label: "Ringkasan", icon: Activity },
    { value: "links", label: "Tautan", icon: LinkIcon },
    { value: "users", label: "Admin", icon: Users },
    { value: "user-access", label: "Akses", icon: ShieldCheck },
    { value: "security", label: "Keamanan", icon: ShieldCheck },
    { value: "logs", label: "Logs", icon: Clock },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-7xl"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-full bg-card border hover:bg-accent transition-colors shadow-sm"
            aria-label="Kembali"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Kelola file dan pengguna
            </p>
          </div>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          {/* Scrollable Mobile-First Navigation */}
          <div
            className="w-full overflow-x-auto pb-4 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar"
            style={scrollbarHideStyles}
          >
            <TabsList className="flex w-max h-auto bg-transparent p-0 gap-2">
              {tabItems.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all shadow-sm"
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="summary" className="mt-2 space-y-6">
            {/* Summary Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="p-3 bg-blue-500/10 rounded-full text-blue-600 mb-3">
                  <LinkIcon size={24} />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Total Link
                </p>
                <p className="text-2xl font-bold">{shareLinks.length}</p>
              </div>

              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="p-3 bg-purple-500/10 rounded-full text-purple-600 mb-3">
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Request Aktif
                </p>
                <p className="text-2xl font-bold">
                  {fileRequests.filter((r) => r.expiresAt > Date.now()).length}
                </p>
              </div>

              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="p-3 bg-red-500/10 rounded-full text-red-600 mb-3">
                  <Hourglass size={24} />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Kedaluwarsa
                </p>
                <p className="text-2xl font-bold">{expiredLinks.length}</p>
              </div>

              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-600 mb-3">
                  <Users size={24} />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Total Admin
                </p>
                <p className="text-2xl font-bold">{adminEmails.length}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 px-1">Statistik</h2>
              {isLoadingStats ? (
                <div className="bg-card border rounded-xl p-6 h-64 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
                    <h3 className="text-base font-semibold mb-4">
                      Unduhan Hari Ini
                    </h3>
                    <TodayDownloadsChart data={stats.downloadsToday} />
                  </div>

                  <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
                    <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <Activity size={18} className="text-primary" /> Top User
                      (90 Hari)
                    </h3>
                    <div className="space-y-4">
                      {stats.topUsers?.length > 0 ? (
                        stats.topUsers.map((user, idx) => (
                          <div
                            key={user.email}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={cn(
                                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                  idx < 3
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {idx + 1}
                              </span>
                              <span className="truncate font-medium">
                                {user.email}
                              </span>
                            </div>
                            <span className="font-mono text-muted-foreground text-xs bg-muted px-2 py-1 rounded-md">
                              {user.count}x
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-8">
                          Belum ada data.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm xl:col-span-2">
                    <h3 className="text-base font-semibold mb-4">
                      Tren Mingguan
                    </h3>
                    <DayOfWeekChart data={stats.downloadsByDayOfWeek} />
                  </div>
                </div>
              ) : (
                <div className="bg-card border rounded-xl p-6 text-center text-muted-foreground">
                  Gagal memuat data.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-2 space-y-8">
            <SecurityConfig />
            <div className="space-y-4">
              <h2 className="text-xl font-semibold px-1">
                Autentikasi 2 Faktor
              </h2>
              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
                <TwoFactorAuthSetup />
              </div>
            </div>
            <ProtectedFoldersManager />
          </TabsContent>

          <TabsContent value="users" className="mt-2">
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b">
                <h2 className="text-lg font-semibold mb-4">Tambah Admin</h2>
                <form
                  onSubmit={handleAddAdmin}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-grow">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingAdmin}
                    className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingAdmin ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <UserPlus size={18} />
                    )}
                    <span>Tambah</span>
                  </button>
                </form>
              </div>

              <div className="p-4 sm:p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                  Daftar Admin
                </h3>
                {isFetchingAdmins ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adminEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border hover:border-border/80 transition-colors"
                      >
                        <span className="text-sm font-medium truncate mr-2">
                          {email}
                        </span>
                        <button
                          onClick={() => handleRemoveAdmin(email)}
                          disabled={
                            session?.user?.email === email &&
                            adminEmails.length === 1
                          }
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="user-access" className="mt-2">
            <UserFolderAccessManager />
          </TabsContent>

          <TabsContent value="links" className="mt-2 space-y-6">
            {shareLinks.length === 0 && fileRequests.length === 0 ? (
              <div className="text-center py-20 bg-card border rounded-xl border-dashed">
                <LinkIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Belum ada tautan aktif.</p>
              </div>
            ) : (
              <>
                {/* File Requests Section */}
                {fileRequests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2 px-1">
                      <UploadCloud className="text-purple-500" size={20} />{" "}
                      Request Upload
                    </h3>
                    <AnimatePresence>
                      {fileRequests.map((req) => {
                        const isExpired = req.expiresAt < Date.now();
                        const publicUrl = `${window.location.origin}/request/${req.token}`;
                        return (
                          <motion.div
                            key={req.token}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              "bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden",
                              isExpired && "opacity-70 grayscale-[0.5]",
                            )}
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-base truncate pr-2">
                                    {req.title}
                                  </h4>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Clock size={12} /> Exp:{" "}
                                    {format(req.expiresAt, "dd MMM HH:mm", {
                                      locale: id,
                                    })}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0",
                                    isExpired
                                      ? "bg-red-100 text-red-700 dark:bg-red-900/30"
                                      : "bg-green-100 text-green-700 dark:bg-green-900/30",
                                  )}
                                >
                                  {isExpired ? "Expired" : "Active"}
                                </span>
                              </div>

                              <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
                                <p className="text-xs font-mono text-muted-foreground truncate flex-1">
                                  {publicUrl}
                                </p>
                                <button
                                  onClick={() => handleCopy(publicUrl)}
                                  className="p-1.5 hover:bg-background rounded shadow-sm"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t mt-1">
                                <span className="text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                                  Folder: {req.folderName}
                                </span>
                                <button
                                  onClick={() =>
                                    handleDeleteClick(req, "request")
                                  }
                                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                                >
                                  <Trash2 size={16} /> Hapus
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}

                {/* Share Links Section */}
                {shareLinks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2 px-1 mt-6">
                      <LinkIcon className="text-blue-500" size={20} /> Link
                      Berbagi
                    </h3>
                    <AnimatePresence>
                      {shareLinks.map((link) => {
                        const isExpired = new Date(link.expiresAt) < new Date();
                        const shareUrl = `${window.location.origin}${link.path}?share_token=${link.token}`;

                        return (
                          <motion.div
                            key={link.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              "bg-card border rounded-xl p-4 shadow-sm",
                              isExpired && "opacity-70 border-dashed",
                            )}
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                <div className="min-w-0 pr-2">
                                  <h4 className="font-semibold text-base truncate text-primary">
                                    {link.itemName}
                                  </h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Eye size={12} /> {link.viewCount || 0}
                                    </span>
                                    {link.loginRequired && (
                                      <span className="text-[10px] border border-blue-200 text-blue-600 px-1.5 rounded flex items-center gap-1">
                                        <ShieldCheck size={10} /> Login
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full shrink-0 mt-2",
                                    isExpired ? "bg-red-500" : "bg-green-500",
                                  )}
                                  title={isExpired ? "Expired" : "Active"}
                                />
                              </div>

                              <div className="bg-muted/50 rounded-lg p-2.5 flex items-center gap-3">
                                <input
                                  readOnly
                                  value={shareUrl}
                                  className="bg-transparent text-xs font-mono text-muted-foreground flex-1 outline-none min-w-0"
                                />
                                <button
                                  onClick={() => handleCopy(shareUrl)}
                                  className="p-1.5 bg-background hover:bg-accent rounded shadow-sm border"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <p className="text-xs text-muted-foreground">
                                  Exp:{" "}
                                  {format(
                                    new Date(link.expiresAt),
                                    "dd MMM yy, HH:mm",
                                    { locale: id },
                                  )}
                                </p>
                                <button
                                  onClick={() =>
                                    handleDeleteClick(link, "share")
                                  }
                                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5"
                                >
                                  <Trash2 size={14} /> Hapus
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-2">
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <ActivityLogDashboard />
            </div>
          </TabsContent>
        </Tabs>
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
