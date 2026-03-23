"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { useAppStore } from "@/lib/store";
import type { DriveFile } from "@/lib/drive";
import type { SubtitleTrack } from "@/lib/subtitles";
import { getFileType } from "@/lib/utils";
import { fetchFolderPathApi } from "@/hooks/useFileFetching";

interface TmdbGenre {
  name: string;
}

interface TmdbMetadata {
  genres?: TmdbGenre[];
}

export interface FileDetailProps {
  file: DriveFile;
  isModal?: boolean;
  prevFileUrl?: string;
  nextFileUrl?: string;
  subtitleTracks?: SubtitleTrack[];
  currentFolderId?: string;
  onAddSubtitle?: (track: SubtitleTrack) => void;
  onRemoveSubtitle?: (src: string) => void;
  onCloseModal?: () => void;
}

export function useFileDetailController({
  file,
  isModal = false,
  subtitleTracks,
  currentFolderId,
}: Pick<
  FileDetailProps,
  "file" | "isModal" | "subtitleTracks" | "currentFolderId"
>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const addToast = useAppStore((state) => state.addToast);
  const user = useAppStore((state) => state.user);
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);
  const hideAuthor = useAppStore((state) => state.hideAuthor);
  const fileTags = useAppStore((state) => state.fileTags);
  const fetchTags = useAppStore((state) => state.fetchTags);
  const addTag = useAppStore((state) => state.addTag);
  const removeTag = useAppStore((state) => state.removeTag);
  const folderTokens = useAppStore((state) => state.folderTokens);
  const setCurrentFileId = useAppStore((state) => state.setCurrentFileId);
  const setCurrentFolderId = useAppStore((state) => state.setCurrentFolderId);
  const isTheaterMode = useAppStore((state) => state.isTheaterMode);
  const sharePolicy = useAppStore((state) => state.sharePolicy);

  const [internalPreviewOpen, setInternalPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [editableContent, setEditableContent] = useState<string | null>(null);
  const [isFetchingEditableContent, setIsFetchingEditableContent] =
    useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [showArchivePreview, setShowArchivePreview] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [activeSubtitleTracks, setActiveSubtitleTracks] = useState<
    SubtitleTrack[]
  >(subtitleTracks || []);
  const [tmdbGenres, setTmdbGenres] = useState<string[]>([]);

  const t = useTranslations("FileDetail");
  const locale = useLocale();

  useEffect(() => {
    fetchTags(file.id);
  }, [file.id, fetchTags]);

  useEffect(() => {
    if (!isModal) {
      setCurrentFileId(file.id);
      if (currentFolderId) {
        setCurrentFolderId(currentFolderId);
      }
    }
  }, [file.id, currentFolderId, isModal, setCurrentFileId, setCurrentFolderId]);

  const handleAddSubtitle = (track: SubtitleTrack) => {
    setActiveSubtitleTracks((prev) => {
      if (
        prev.find(
          (item) => item.src === track.src || item.label === track.label,
        )
      ) {
        return prev;
      }
      return [...prev, track];
    });
  };

  const handleRemoveSubtitle = (src: string) => {
    setActiveSubtitleTracks((prev) => prev.filter((item) => item.src !== src));
  };

  const handleMetadataLoaded = React.useCallback((data: TmdbMetadata) => {
    setTmdbGenres(data.genres?.map((genre) => genre.name) || []);
  }, []);

  const shareToken = useMemo(
    () => searchParams.get("share_token"),
    [searchParams],
  );
  const isAdmin = user?.role === "ADMIN" || session?.user?.role === "ADMIN";
  const canShowAuthor = isAdmin || !hideAuthor;
  const fileType = getFileType(file);

  const { data: folderPathData } = useQuery({
    queryKey: ["folderPath", currentFolderId, shareToken, locale],
    queryFn: () => fetchFolderPathApi(currentFolderId!, shareToken, locale),
    enabled: !!currentFolderId,
    staleTime: 1000 * 60 * 5,
  });

  const bestToken = useMemo(() => {
    const parentId = file.parents?.[0];
    if (parentId && folderTokens[parentId]) {
      return folderTokens[parentId];
    }
    if (currentFolderId && folderTokens[currentFolderId]) {
      return folderTokens[currentFolderId];
    }

    const path = Array.isArray(folderPathData) ? folderPathData : [];
    const found = [...path]
      .reverse()
      .find((pathItem) => folderTokens[pathItem.id]);
    return found ? folderTokens[found.id] : null;
  }, [file.parents, currentFolderId, folderTokens, folderPathData]);

  const directLink = useMemo(() => {
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }
    if (bestToken) {
      url += `&access_token=${bestToken}`;
    }
    return url;
  }, [file.id, shareToken, bestToken]);

  const authenticatedSubtitleTracks = useMemo(() => {
    if (!bestToken) {
      return activeSubtitleTracks;
    }

    return activeSubtitleTracks.map((track) => {
      if (track.src.includes("access_token=")) {
        return track;
      }
      const separator = track.src.includes("?") ? "&" : "?";
      return {
        ...track,
        src: `${track.src}${separator}access_token=${bestToken}`,
      };
    });
  }, [activeSubtitleTracks, bestToken]);

  const archivePreviewLimit = 100 * 1024 * 1024;
  const isArchivePreviewable =
    fileType === "archive" &&
    parseInt(file.size || "0", 10) <= archivePreviewLimit;
  const isEditable =
    isAdmin &&
    (fileType === "code" || fileType === "markdown" || fileType === "text");
  const isDocPreviewable = fileType === "office" || fileType === "pdf";
  const isTextPreviewable =
    fileType === "code" || fileType === "markdown" || fileType === "text";
  const isPreviewable = [
    "audio",
    "video",
    "image",
    "pdf",
    "office",
    "ebook",
    "code",
    "text",
    "markdown",
  ].includes(fileType);

  useEffect(() => {
    setInternalPreviewOpen(false);
    setShowDocPreview(false);
    setShowTextPreview(false);
  }, [file.id]);

  useEffect(() => {
    if (isModal || internalPreviewOpen) {
      if (isDocPreviewable) {
        setShowDocPreview(true);
      }
      if (isTextPreviewable) {
        setShowTextPreview(true);
      }
    }
  }, [isModal, internalPreviewOpen, isDocPreviewable, isTextPreviewable]);

  useEffect(() => {
    const shouldFetch =
      (isEditing && isEditable && !editableContent) ||
      (!isEditing && showTextPreview && !textContent);

    if (!shouldFetch) {
      return;
    }

    setIsFetchingEditableContent(true);
    fetch(directLink)
      .then((response) =>
        response.ok ? response.text() : Promise.reject("Fail"),
      )
      .then((text) => {
        if (isEditing) {
          setEditableContent(text);
        } else {
          setTextContent(text);
        }
      })
      .finally(() => setIsFetchingEditableContent(false));
  }, [
    isEditing,
    isEditable,
    editableContent,
    directLink,
    showTextPreview,
    textContent,
  ]);

  const handleSaveChanges = async () => {
    if (editableContent === null) {
      return;
    }

    setIsSaving(true);
    try {
      await fetch("/api/files/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, newContent: editableContent }),
      });
      addToast({ message: t("saved"), type: "success" });
      setIsEditing(false);
      triggerRefresh();
      if (["markdown", "text"].includes(fileType)) {
        setTextContent(editableContent);
      }
    } catch {
      addToast({ message: t("saveFailed"), type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}${directLink}`);
    addToast({ message: t("linkCopied"), type: "success" });
  };

  return {
    router,
    t,
    locale,
    user,
    sharePolicy,
    shareToken,
    isAdmin,
    canShowAuthor,
    fileType,
    fileTags,
    addTag,
    removeTag,
    directLink,
    authenticatedSubtitleTracks,
    isArchivePreviewable,
    isEditable,
    isDocPreviewable,
    isTextPreviewable,
    isPreviewable,
    isTheaterMode,
    internalPreviewOpen,
    setInternalPreviewOpen,
    isEditing,
    setIsEditing,
    isSaving,
    textContent,
    editableContent,
    setEditableContent,
    isFetchingEditableContent,
    showTextPreview,
    setShowTextPreview,
    showDocPreview,
    setShowDocPreview,
    showArchivePreview,
    setShowArchivePreview,
    showImageEditor,
    setShowImageEditor,
    showHistory,
    setShowHistory,
    showMobileInfo,
    setShowMobileInfo,
    tmdbGenres,
    handleAddSubtitle,
    handleRemoveSubtitle,
    handleMetadataLoaded,
    handleSaveChanges,
    handleCopyLink,
  };
}
