import {
  useState,
  useEffect,
  useCallback,
  useRef,
  SetStateAction,
  Dispatch,
} from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { DriveFile } from "@/lib/googleDrive";

interface HistoryItem {
  id: string;
  name: string;
}

interface UseFileFetchingProps {
  initialFolderId?: string;
  shareToken: string | null;
  folderTokens: Record<string, string>;
  addToast: (toast: { message: string; type: "error" | "info" }) => void;
  router: AppRouterInstance;
  refreshKey: number;
}

export function useFileFetching({
  initialFolderId,
  shareToken,
  folderTokens,
  addToast,
  router,
  refreshKey,
}: UseFileFetchingProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const currentFolderId =
    history.length > 0
      ? history[history.length - 1]?.id
      : initialFolderId || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

  const handleFetchError = useCallback(
    async (
      response: Response,
      defaultMessage: string,
      folderId: string,
      folderName: string,
    ): Promise<{ authModal: { isOpen: boolean; folderId: string; folderName: string } | null }> => {
      const errorData = await response.json();
      if (response.status === 401) {
        if (errorData.protected) {
          return { authModal: { isOpen: true, folderId, folderName } };
        } else {
          addToast({
            message: "Sesi Anda telah berakhir. Silakan login kembali.",
            type: "error",
          });
          if (!shareToken) {
            router.push("/login?error=SessionExpired");
          }
        }
      } else {
        addToast({
          message: errorData.error || defaultMessage,
          type: "error",
        });
      }
      setIsLoading(false);
      return { authModal: null };
    },
    [addToast, router, shareToken],
  );

  const fetchFiles = useCallback(
    async (folderId: string, folderName: string) => {
      setIsLoading(true);
      setFiles([]);
      setNextPageToken(null);
      let authModal = null;

      try {
        const url = new URL(window.location.origin + "/api/files");
        url.searchParams.append("folderId", folderId);
        if (shareToken) {
          url.searchParams.append("share_token", shareToken);
        }

        const headers = new Headers();
        const folderAuthToken = folderTokens[folderId];
        if (folderAuthToken) {
          headers.append("Authorization", `Bearer ${folderAuthToken}`);
        }

        const response = await fetch(url.toString(), {
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          const errorResult = await handleFetchError(
            response,
            "Gagal mengambil data file.",
            folderId,
            folderName,
          );
          authModal = errorResult.authModal;
          return;
        }
        const data = await response.json();
        setFiles(data.files || []);
        setNextPageToken(data.nextPageToken || null);
      } catch (error) {
        addToast({ message: "Terjadi kesalahan jaringan.", type: "error" });
      } finally {
        setIsLoading(false);
      }
      return { authModal };
    },
    [folderTokens, handleFetchError, addToast, shareToken],
  );

  const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage || !nextPageToken || !currentFolderId) return;

    setIsFetchingNextPage(true);
    try {
      const url = new URL(window.location.origin + "/api/files");
      url.searchParams.append("folderId", currentFolderId);
      url.searchParams.append("pageToken", nextPageToken);
      if (shareToken) {
        url.searchParams.append("share_token", shareToken);
      }
      const headers = new Headers();
      const folderAuthToken = folderTokens[currentFolderId];
      if (folderAuthToken) {
        headers.append("Authorization", `Bearer ${folderAuthToken}`);
      }

      const response = await fetch(url.toString(), {
        headers,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Gagal memuat item berikutnya.");
      }
      const data = await response.json();
      setFiles((prevFiles) => [...prevFiles, ...(data.files || [])]);
      setNextPageToken(data.nextPageToken || null);
    } catch (error: any) {
      addToast({ message: error.message, type: "error" });
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [
    isFetchingNextPage,
    nextPageToken,
    currentFolderId,
    shareToken,
    folderTokens,
    addToast,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 },
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [fetchNextPage]);

  useEffect(() => {
    const rootFolder = {
      id: process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!,
      name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Beranda",
    };
    const folderToLoad = initialFolderId || rootFolder.id;

    const currentFolder =
      history.length > 0 ? history[history.length - 1] : null;
    if (!currentFolder || currentFolder.id !== folderToLoad) {
      if (folderToLoad === rootFolder.id) {
        setHistory([rootFolder]);
      } else {
        const fetchPath = async () => {
          try {
            const url = new URL(`/api/folderpath`, window.location.origin);
            url.searchParams.set("folderId", folderToLoad);
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error("Gagal memuat path folder.");
            const path = await response.json();
            setHistory([rootFolder, ...path]);
          } catch (error) {
            addToast({
              message: "Gagal memuat path, kembali ke Beranda.",
              type: "error",
            });
            router.push("/");
          }
        };
        fetchPath();
      }
    }
  }, [initialFolderId, router, addToast, history]);

  return {
    files,
    setFiles,
    history,
    setHistory,
    isLoading,
    setIsLoading,
    nextPageToken,
    isFetchingNextPage,
    currentFolderId,
    loaderRef,
    fetchFiles,
  };
}