import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface UseFileFetchingProps {
  initialFolderId?: string;
  initialFolderPath?: { id: string; name: string }[];
  shareToken: string | null;
  folderTokens: Record<string, string>;
  addToast: (toast: { message: string; type: "error" | "info" }) => void;
  router: AppRouterInstance;
  refreshKey: number;
  locale: string;
}

export class ProtectedError extends Error {
  isProtected: boolean;
  folderId: string;
  constructor(message: string, folderId: string) {
    super(message);
    this.name = "ProtectedError";
    this.isProtected = true;
    this.folderId = folderId;
  }
}

const fetchFilesApi = async ({
  folderId,
  pageToken,
  shareToken,
  folderToken,
  refresh,
}: {
  folderId: string;
  pageToken?: string | null;
  shareToken?: string | null;
  folderToken?: string;
  refresh?: boolean;
}) => {
  const url = new URL(window.location.origin + "/api/files");
  url.searchParams.append("folderId", folderId);
  if (pageToken) url.searchParams.append("pageToken", pageToken);
  if (shareToken) url.searchParams.append("share_token", shareToken);
  if (refresh) url.searchParams.append("refresh", "true");

  const headers = new Headers();
  if (folderToken) {
    headers.append("Authorization", `Bearer ${folderToken}`);
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 401 && errorData.protected) {
      throw new ProtectedError(errorData.error, folderId);
    }
    const err = new Error(errorData.error || "Gagal mengambil data file.");
    (err as any).status = response.status;
    (err as any).isProtected = errorData.protected || false;
    (err as any).folderId = errorData.folderId || folderId;
    throw err;
  }

  return response.json();
};

const fetchFolderPathApi = async (
  folderId: string,
  shareToken?: string | null,
  locale?: string,
) => {
  const url = new URL(window.location.origin + "/api/folderpath");
  url.searchParams.append("folderId", folderId);
  if (shareToken) url.searchParams.append("share_token", shareToken);
  if (locale) url.searchParams.append("locale", locale);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorData = await response.json();
    const err = new Error(errorData.error || "Gagal mengambil data folder.");
    (err as any).status = response.status;
    (err as any).isProtected = errorData.protected || false;
    (err as any).folderId = errorData.folderId || folderId;
    throw err;
  }
  return response.json();
};

export function useFileFetching({
  initialFolderId,
  initialFolderPath,
  initialFiles,
  initialNextPageToken,
  shareToken,
  folderTokens,
  addToast,
  router,
  refreshKey,
  locale,
}: UseFileFetchingProps & {
  initialFiles?: any[];
  initialNextPageToken?: string | null;
}) {
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;
  const currentFolderId = initialFolderId || rootFolderId;

  const { data: historyData } = useQuery({
    queryKey: ["folderPath", currentFolderId, shareToken, refreshKey, locale],
    queryFn: () => fetchFolderPathApi(currentFolderId, shareToken, locale),
    enabled: !!currentFolderId && currentFolderId !== rootFolderId,
    initialData: initialFolderPath,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });

  const history = useMemo(() => {
    if (currentFolderId === rootFolderId) {
      return [
        {
          id: rootFolderId,
          name:
            process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME ||
            (locale === "id" ? "Beranda" : "Home"),
        },
      ];
    }

    const rawPath = Array.isArray(historyData) ? historyData : [];
    const protectedIndex = rawPath.findIndex(
      (folder) => folderTokens[folder.id],
    );

    if (protectedIndex !== -1) {
      const slicedPath = rawPath.slice(protectedIndex);

      if (slicedPath.length > 0 && slicedPath[0].id !== rootFolderId) {
        return [
          {
            id: rootFolderId,
            name:
              process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME ||
              (locale === "id" ? "Beranda" : "Home"),
          },
          ...slicedPath,
        ];
      }

      return slicedPath;
    }

    return rawPath;
  }, [historyData, currentFolderId, rootFolderId, folderTokens, locale]);

  const bestToken = useMemo(() => {
    if (folderTokens[currentFolderId]) return folderTokens[currentFolderId];
    const hist = Array.isArray(historyData) ? historyData : [];
    const found = [...hist].reverse().find((f) => folderTokens[f.id]);
    return found ? folderTokens[found.id] : undefined;
  }, [currentFolderId, folderTokens, historyData]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["files", currentFolderId, shareToken, bestToken, refreshKey],
    queryFn: ({ pageParam }) =>
      fetchFilesApi({
        folderId: currentFolderId,
        pageToken: pageParam as string | null,
        shareToken,
        folderToken: bestToken,
        refresh: refreshKey > 0,
      }),
    initialPageParam: null as string | null,
    initialData:
      refreshKey === 0 && initialFiles
        ? {
            pages: [
              { files: initialFiles, nextPageToken: initialNextPageToken },
            ],
            pageParams: [null],
          }
        : undefined,
    getNextPageParam: (lastPage) => lastPage?.nextPageToken || undefined,
    retry: (failureCount, error: any) => {
      if (error instanceof ProtectedError || error?.isProtected) return false;
      if (error?.status === 401) return false;
      return failureCount < 2;
    },
    refetchInterval: (query) => (query.state.error ? false : 30000),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    enabled: !!currentFolderId && currentFolderId !== "undefined",
  });

  const files = useMemo(() => {
    return data?.pages.flatMap((page) => page?.files || []) || [];
  }, [data]);

  useEffect(() => {
    if (error) {
      const err = error as any;

      if (err.isProtected) {
        return;
      }

      addToast({
        message: err.message || "Gagal memuat data.",
        type: "error",
      });

      if (err.message?.includes("Sesi Anda telah berakhir")) {
        router.push("/login?error=SessionExpired");
      }

      if (err.message === "ShareLinkExpired") {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("share_token");
        router.push(
          `/login?error=ShareLinkExpired&callbackUrl=${encodeURIComponent(
            currentUrl.pathname + currentUrl.search,
          )}`,
        );
      }

      if (err.status === 401 && !err.isProtected) {
        const currentUrl = new URL(window.location.href);
        router.push(
          `/login?callbackUrl=${encodeURIComponent(
            currentUrl.pathname + currentUrl.search,
          )}`,
        );
      }
    }
  }, [error, addToast, router]);

  const authModalInfo = useMemo(() => {
    const err = error as any;
    if (err?.isProtected) {
      const folderName =
        history.find((f) => f.id === err.folderId)?.name || "Folder Terkunci";

      return {
        isOpen: true,
        folderId: err.folderId,
        folderName: folderName,
      };
    }
    return null;
  }, [error, history]);

  return {
    files,
    history,
    isLoading,
    isFetchingNextPage,
    nextPageToken: hasNextPage ? "yes" : null,
    fetchNextPage,
    refetchFiles: refetch,
    currentFolderId,
    authModalInfo,
    error,
  };
}
