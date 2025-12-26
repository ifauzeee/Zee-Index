"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useAppStore, ShareLink, FileRequestLink } from "@/lib/store";
import { useConfirm } from "@/components/providers/ModalProvider";
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
  HardDrive,
  KeyRound,
  FolderLock,
  Network,
  Palette,
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
import ManualDrivesManager from "@/components/ManualDrivesManager";
import BrandingConfig from "@/components/BrandingConfig";
import { useTranslations } from "next-intl";

const scrollbarHideStyles = {
  msOverflowStyle: "none" as const,
  scrollbarWidth: "none" as const,
};

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
  const { confirm } = useConfirm();
  const { status, data: session } = useSession();
  const router = useRouter();
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const t = useTranslations("AdminPage");

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
            message: t("loadingStatsError", { error: err.message }),
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
    t,
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
    addToast({ message: t("linkCopied"), type: "success" });
  };

  const handleDelete = async (
    item: ShareLink | FileRequestLink,
    type: "share" | "request",
  ) => {
    if (
      await confirm(t("revokeConfirm"), {
        title: t("revokeTitle"),
        variant: "destructive",
        confirmText: t("revokeButton"),
      })
    ) {
      if (type === "share") {
        await removeShareLink(item as ShareLink);
      } else {
        await removeFileRequest((item as FileRequestLink).token);
      }
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
      await confirm(t("removeAdminConfirm", { email }), {
        title: t("removeAdminTitle"),
        variant: "destructive",
      })
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
        <h1 className="text-2xl font-bold mb-2">{t("accessDenied")}</h1>
        <p className="text-muted-foreground max-w-md">
          {t("accessDeniedMessage")}
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium"
        >
          {t("backToHome")}
        </button>
      </div>
    );
  }

  const tabItems = [
    { value: "summary", label: t("summary"), icon: Activity },
    { value: "users", label: t("admin"), icon: Users },
    { value: "security", label: t("security"), icon: ShieldCheck },
    { value: "branding", label: t("branding"), icon: Palette },
    { value: "logs", label: t("logs"), icon: Clock },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-7xl"
      >
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-full bg-card border hover:bg-accent transition-colors shadow-sm"
            aria-label="Kembali"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <Tabs defaultValue="summary" className="w-full">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="p-3 bg-blue-500/10 rounded-full text-blue-600 mb-3">
                  <LinkIcon size={24} />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {t("totalLinks")}
                </p>
                <p className="text-2xl font-bold">{shareLinks.length}</p>
              </div>

              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="p-3 bg-purple-500/10 rounded-full text-purple-600 mb-3">
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {t("activeRequests")}
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
                  {t("expired")}
                </p>
                <p className="text-2xl font-bold">{expiredLinks.length}</p>
              </div>

              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-600 mb-3">
                  <Users size={24} />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {t("totalAdmin")}
                </p>
                <p className="text-2xl font-bold">{adminEmails.length}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 px-1">
                {t("statistics")}
              </h2>
              {isLoadingStats ? (
                <div className="bg-card border rounded-xl p-6 h-64 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
                    <h3 className="text-base font-semibold mb-4">
                      {t("todaysDownloads")}
                    </h3>
                    <TodayDownloadsChart data={stats.downloadsToday} />
                  </div>

                  <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
                    <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <Activity size={18} className="text-primary" />{" "}
                      {t("topUser")}
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
                          {t("noData")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm xl:col-span-2">
                    <h3 className="text-base font-semibold mb-4">
                      {t("weeklyTrend")}
                    </h3>
                    <DayOfWeekChart data={stats.downloadsByDayOfWeek} />
                  </div>
                </div>
              ) : (
                <div className="bg-card border rounded-xl p-6 text-center text-muted-foreground">
                  {t("failed")}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-2 space-y-10">
            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <ShieldCheck className="text-primary" />
                <h3 className="text-lg font-bold">{t("basicConfig")}</h3>
              </div>
              <SecurityConfig />
              <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
                <h4 className="text-base font-semibold mb-4">
                  {t("twoFactor")}
                </h4>
                <TwoFactorAuthSetup />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <FolderLock className="text-amber-500" />
                <h3 className="text-lg font-bold">{t("protection")}</h3>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <ProtectedFoldersManager />
                </div>
                <div>
                  <UserFolderAccessManager />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <HardDrive className="text-blue-500" />
                <h3 className="text-lg font-bold">{t("sharedDrives")}</h3>
              </div>
              <ManualDrivesManager />
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <Network className="text-purple-500" />
                <h3 className="text-lg font-bold">
                  {t("activeLinkManagement")}
                </h3>
              </div>

              {shareLinks.length === 0 && fileRequests.length === 0 ? (
                <div className="text-center py-12 bg-card border rounded-xl border-dashed">
                  <LinkIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("noActiveLinks")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fileRequests.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-2">
                        <UploadCloud size={16} /> {t("requestUpload")}
                      </h4>
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
                                    onClick={() => handleDelete(req, "request")}
                                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                                  >
                                    <Trash2 size={16} /> Delete
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}

                  {shareLinks.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-2">
                        <LinkIcon size={16} /> {t("shareLinks")}
                      </h4>
                      <AnimatePresence>
                        {shareLinks.map((link) => {
                          const isExpired =
                            new Date(link.expiresAt) < new Date();
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
                                          <KeyRound size={10} /> Login
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
                                    onClick={() => handleDelete(link, "share")}
                                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5"
                                  >
                                    <Trash2 size={14} /> Delete
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
              )}
            </section>
          </TabsContent>

          <TabsContent value="branding" className="mt-2">
            <BrandingConfig />
          </TabsContent>

          <TabsContent value="users" className="mt-2">
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b">
                <h2 className="text-lg font-semibold mb-4">{t("addAdmin")}</h2>
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
                      placeholder={t("emailPlaceholder")}
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
                    <span>{t("add")}</span>
                  </button>
                </form>
              </div>

              <div className="p-4 sm:p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                  {t("adminList")}
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

          <TabsContent value="logs" className="mt-2">
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <ActivityLogDashboard />
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </>
  );
}
