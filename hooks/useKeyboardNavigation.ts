"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface UseKeyboardNavigationProps {
  files: Array<{ id: string; name: string; mimeType: string }>;
  onFileOpen?: (file: { id: string; name: string; mimeType: string }) => void;
  onFilePreview?: (file: {
    id: string;
    name: string;
    mimeType: string;
  }) => void;
  onFileDelete?: (file: { id: string; name: string; mimeType: string }) => void;
  onFileRename?: (file: { id: string; name: string; mimeType: string }) => void;
  onOpenSearch?: () => void;
}

export function useKeyboardNavigation({
  files,
  onFileOpen,
  onFilePreview,
  onFileDelete,
  onFileRename,
  onOpenSearch,
}: UseKeyboardNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const [searchBuffer, setSearchBuffer] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < files.length - 1 ? prev + 1 : prev,
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;

        case "Enter":
          if (focusedIndex >= 0 && focusedIndex < files.length) {
            const file = files[focusedIndex];
            if (file.mimeType === "application/vnd.google-apps.folder") {
              router.push(`/folder/${file.id}`);
            } else if (onFileOpen) {
              onFileOpen(file);
            }
          }
          break;

        case "Backspace":
          if (searchBuffer.length > 0) {
            setSearchBuffer((prev) => prev.slice(0, -1));
          } else if (pathname !== "/" && !pathname?.startsWith("/admin")) {
            e.preventDefault();
            router.back();
          }
          break;

        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;

        case "End":
          e.preventDefault();
          setFocusedIndex(files.length - 1);
          break;

        case "Escape":
          setFocusedIndex(-1);
          setSearchBuffer("");
          break;

        case " ":
          e.preventDefault();
          if (
            focusedIndex >= 0 &&
            focusedIndex < files.length &&
            files[focusedIndex].mimeType !==
              "application/vnd.google-apps.folder" &&
            onFilePreview
          ) {
            onFilePreview(files[focusedIndex]);
          }
          break;

        case "Delete":
          if (
            focusedIndex >= 0 &&
            focusedIndex < files.length &&
            onFileDelete
          ) {
            e.preventDefault();
            onFileDelete(files[focusedIndex]);
          }
          break;

        case "F2":
          if (
            focusedIndex >= 0 &&
            focusedIndex < files.length &&
            onFileRename
          ) {
            e.preventDefault();
            onFileRename(files[focusedIndex]);
          }
          break;

        case "/":
          if (searchBuffer.length === 0 && onOpenSearch) {
            e.preventDefault();
            onOpenSearch();
          }
          break;

        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const newBuffer = searchBuffer + e.key.toLowerCase();
            setSearchBuffer(newBuffer);

            const matchIndex = files.findIndex((file) =>
              file.name.toLowerCase().startsWith(newBuffer),
            );

            if (matchIndex !== -1) {
              setFocusedIndex(matchIndex);
            }

            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            searchTimerRef.current = setTimeout(() => setSearchBuffer(""), 500);
          }
          break;
      }
    },
    [
      files,
      focusedIndex,
      router,
      pathname,
      onFileOpen,
      onFilePreview,
      onFileDelete,
      onFileRename,
      onOpenSearch,
      searchBuffer,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [pathname]);

  useEffect(() => {
    if (focusedIndex >= 0) {
      const element = document.querySelector(
        `[data-file-index="${focusedIndex}"]`,
      );
      if (element) {
        element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [focusedIndex]);

  return {
    focusedIndex,
    setFocusedIndex,
  };
}
