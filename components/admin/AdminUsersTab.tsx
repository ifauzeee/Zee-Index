"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useConfirm } from "@/components/providers/ModalProvider";
import { Trash2, UserPlus, Loader2, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import UserPasswordManager from "@/components/admin/UserPasswordManager";
import { UserListSkeleton } from "@/components/admin/skeletons";
import { useTranslations } from "next-intl";

export default function AdminUsersTab() {
  const {
    adminEmails,
    isFetchingAdmins,
    fetchAdminEmails,
    addAdminEmail,
    removeAdminEmail,
    editorEmails,
    isFetchingEditors,
    fetchEditorEmails,
    addEditorEmail,
    removeEditorEmail,
  } = useAppStore();
  const { confirm } = useConfirm();
  const { data: session } = useSession();
  const t = useTranslations("AdminPage");

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [newEditorEmail, setNewEditorEmail] = useState("");
  const [isSubmittingEditor, setIsSubmittingEditor] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "EDITOR" | "USER">(
    "USER",
  );
  const [invitePassword, setInvitePassword] = useState("");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchAdminEmails();
    fetchEditorEmails();
  }, [fetchAdminEmails, fetchEditorEmails]);

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

  const handleAddEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEditorEmail.trim()) return;
    setIsSubmittingEditor(true);
    await addEditorEmail(newEditorEmail);
    setNewEditorEmail("");
    setIsSubmittingEditor(false);
  };

  const handleRemoveEditor = async (email: string) => {
    if (
      await confirm(
        t("removeEditorConfirm", { email }) || `Remove ${email} from Editors?`,
        {
          title: t("removeEditorTitle"),
          variant: "destructive",
        },
      )
    ) {
      await removeEditorEmail(email);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSubmittingInvite(true);
    setInviteMessage(null);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          password: invitePassword || undefined,
        }),
      });
      if (res.ok) {
        setInviteMessage({ type: "success", text: t("inviteSuccess") });
        setInviteEmail("");
        setInvitePassword("");
      } else {
        setInviteMessage({ type: "error", text: t("inviteFailed") });
      }
    } catch {
      setInviteMessage({ type: "error", text: t("inviteFailed") });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  return (
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
          <UserListSkeleton count={3} />
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
                    session?.user?.email === email && adminEmails.length === 1
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

      <div className="p-4 sm:p-6 border-t">
        <h2 className="text-lg font-semibold mb-4">{t("manageEditors")}</h2>
        <form
          onSubmit={handleAddEditor}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <div className="relative flex-grow">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="email"
              value={newEditorEmail}
              onChange={(e) => setNewEditorEmail(e.target.value)}
              placeholder={t("editorEmailPlaceholder")}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmittingEditor}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmittingEditor ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <UserPlus size={18} />
            )}
            <span>{t("addEditor")}</span>
          </button>
        </form>

        <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
          {t("editorList")}
        </h3>
        {isFetchingEditors ? (
          <UserListSkeleton count={3} />
        ) : (
          <div className="space-y-3">
            {editorEmails.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">
                {t("noEditors")}
              </p>
            ) : (
              editorEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border hover:border-border/80 transition-colors"
                >
                  <span className="text-sm font-medium truncate mr-2">
                    {email}
                  </span>
                  <button
                    onClick={() => handleRemoveEditor(email)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 border-t bg-muted/5">
        <h2 className="text-lg font-semibold mb-1">{t("inviteUser")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("inviteDesc")}</p>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t("inviteEmailPlaceholder")}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "ADMIN" | "EDITOR" | "USER")
              }
              className="sm:w-40 px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              aria-label={t("role")}
            >
              <option value="USER">{t("roleUser")}</option>
              <option value="EDITOR">{t("roleEditor")}</option>
              <option value="ADMIN">{t("roleAdmin")}</option>
            </select>
          </div>
          <input
            type="password"
            value={invitePassword}
            onChange={(e) => setInvitePassword(e.target.value)}
            placeholder={t("invitePasswordPlaceholder")}
            className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
          />
          {inviteMessage && (
            <p
              className={
                inviteMessage.type === "success"
                  ? "text-sm text-green-600"
                  : "text-sm text-red-600"
              }
            >
              {inviteMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmittingInvite}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmittingInvite ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <UserPlus size={18} />
            )}
            <span>{t("inviteButton")}</span>
          </button>
        </form>
      </div>

      <div className="p-4 sm:p-6 border-t bg-muted/5">
        <UserPasswordManager />
      </div>
    </div>
  );
}
