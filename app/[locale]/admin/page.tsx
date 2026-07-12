"use client";

import dynamic from "next/dynamic";
import React, { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Users,
  Activity,
  Palette,
  BarChart3,
} from "lucide-react";
import Loading from "@/components/common/Loading";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

const AdminSummaryTab = dynamic(
  () => import("@/components/admin/AdminSummaryTab"),
  { ssr: false },
);
const AnalyticsDashboard = dynamic(
  () => import("@/components/admin/AnalyticsDashboard"),
  { ssr: false },
);
const AdminUsersTab = dynamic(
  () => import("@/components/admin/AdminUsersTab"),
  { ssr: false },
);
const AdminSecurityTab = dynamic(
  () => import("@/components/admin/AdminSecurityTab"),
  { ssr: false },
);
const BrandingConfig = dynamic(
  () => import("@/components/admin/BrandingConfig"),
  { ssr: false },
);
const ActivityLogDashboard = dynamic(
  () => import("@/components/admin/ActivityLogDashboard"),
  { ssr: false },
);

const scrollbarHideStyles = {
  msOverflowStyle: "none" as const,
  scrollbarWidth: "none" as const,
};

export default function AdminPage() {
  const { user, fetchUser } = useAppStore();
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations("AdminPage");

  useEffect(() => {
    if (status === "authenticated" && !user) {
      fetchUser();
    }
  }, [status, user, fetchUser]);

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
    { value: "analytics", label: t("analytics"), icon: BarChart3 },
    { value: "users", label: t("admin"), icon: Users },
    { value: "security", label: t("security"), icon: ShieldCheck },
    { value: "branding", label: t("branding"), icon: Palette },
    { value: "logs", label: t("logs"), icon: Clock },
  ];

  return (
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
          aria-label={t("back")}
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
          <AdminSummaryTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-2">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm p-4 sm:p-6">
            <AnalyticsDashboard />
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-2 space-y-10">
          <AdminSecurityTab />
        </TabsContent>

        <TabsContent value="branding" className="mt-2">
          <BrandingConfig />
        </TabsContent>

        <TabsContent value="users" className="mt-2">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="logs" className="mt-2">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <ActivityLogDashboard />
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
