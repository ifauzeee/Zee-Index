"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Save,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useSession } from "next-auth/react";
import MarkdownViewer from "@/components/file-details/MarkdownViewer";

interface FolderReadmeProps {
  fileId: string;
}

export default function FolderReadme({ fileId }: FolderReadmeProps) {
  const { shareToken, addToast, user } = useAppStore();
  const { data: session } = useSession();
  const [content, setContent] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewingDraft, setIsPreviewingDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const role = user?.role || session?.user?.role;
  const canEdit =
    !shareToken &&
    !fileId.startsWith("local-storage:") &&
    (role === "ADMIN" || role === "EDITOR");

  useEffect(() => {
    const fetchReadme = async () => {
      setIsLoading(true);
      setIsEditing(false);
      setIsPreviewingDraft(false);
      try {
        let url = `/api/download?fileId=${fileId}`;
        if (shareToken) url += `&share_token=${shareToken}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load README");
        const text = await response.text();
        setContent(text);
        setDraftContent(text);
      } catch {
        addToast({ message: "Gagal memuat README", type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    if (fileId) {
      fetchReadme();
    }
  }, [fileId, shareToken, addToast]);

  const handleEdit = () => {
    setDraftContent(content || "");
    setIsEditing(true);
    setIsPreviewingDraft(false);
    setIsExpanded(true);
  };

  const handleCancel = () => {
    setDraftContent(content || "");
    setIsEditing(false);
    setIsPreviewingDraft(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/files/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, newContent: draftContent }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.details || body?.error || "Save failed");
      }

      setContent(draftContent);
      setIsEditing(false);
      setIsPreviewingDraft(false);
      addToast({ message: "README berhasil disimpan", type: "success" });
    } catch {
      addToast({ message: "Gagal menyimpan README", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return null;
  if (!content) return null;

  return (
    <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <BookOpen size={16} className="text-primary" />
          <span>README.md</span>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (isEditing) {
                  handleCancel();
                } else {
                  handleEdit();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              {isEditing ? <X size={14} /> : <Edit3 size={14} />}
              {isEditing ? "Batal" : "Edit"}
            </button>
          )}
          <button className="text-muted-foreground hover:text-foreground">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isEditing ? (
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-md border bg-background p-1">
                    <button
                      type="button"
                      onClick={() => setIsPreviewingDraft(false)}
                      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition-colors ${
                        !isPreviewingDraft
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPreviewingDraft(true)}
                      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition-colors ${
                        isPreviewingDraft
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Eye size={14} />
                      Preview
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={14} />
                    {isSaving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>

                {isPreviewingDraft ? (
                  <MarkdownViewer
                    content={draftContent}
                    className="min-h-64 rounded-md border bg-background"
                  />
                ) : (
                  <textarea
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    className="min-h-64 w-full resize-y rounded-md border bg-background p-4 font-mono text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    spellCheck={false}
                  />
                )}
              </div>
            ) : (
              <MarkdownViewer content={content} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
