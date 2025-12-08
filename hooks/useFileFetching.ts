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
      throw { isProtected: true, folderId, error: errorData.error };
    }
    throw new Error(errorData.error || "Gagal mengambil data file.");
  }

  return response.json();
};

const fetchFolderPathApi = async (
  folderId: string,
  shareToken: string | null,
) => {
  const url = new URL(`/api/folderpath`, window.location.origin);
  url.searchParams.set("folderId", folderId);
  if (shareToken) url.searchParams.append("share_token", shareToken);

  const response = await fetch(url.toString());
  if (!response.ok) {
    if (response.status === 401) return [];
    throw new Error("Gagal memuat path folder.");
  }
  return response.json();
};

export function useFileFetching({
  initialFolderId,
  initialFolderPath,
  shareToken,
  folderTokens,
  addToast,
  router,
  refreshKey,
}: UseFileFetchingProps) {
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;
  const currentFolderId = initialFolderId || rootFolderId;

  const { data: historyData } = useQuery({
    queryKey: ["folderPath", currentFolderId, shareToken, refreshKey],
    queryFn: () => fetchFolderPathApi(currentFolderId, shareToken),
    enabled: !!currentFolderId && currentFolderId !== rootFolderId,
    initialData: initialFolderPath,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
  });

  const history = useMemo(() => {
    if (currentFolderId === rootFolderId) {
      return [
        {
          id: rootFolderId,
          name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Home",
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
            name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Home",
          },
          ...slicedPath,
        ];
      }

      return slicedPath;
    }

    return rawPath;
  }, [historyData, currentFolderId, rootFolderId, folderTokens]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "files",
      currentFolderId,
      shareToken,
      folderTokens[currentFolderId],
      refreshKey,
    ],
    queryFn: ({ pageParam }) =>
      fetchFilesApi({
        folderId: currentFolderId,
        pageToken: pageParam as string | null,
        shareToken,
        folderToken: folderTokens[currentFolderId],
        refresh: refreshKey > 0,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    retry: (failureCount, error: any) => {
      if (error?.isProtected) return false;
      return failureCount < 2;
    },
    refetchInterval: (query) => {
      if (query.state.status === "error") return false;
      return 5000;
    },
    refetchOnWindowFocus: (query) => {
      if (query.state.status === "error") return false;
      return true;
    },
  });

  const files = useMemo(() => {
    return data?.pages.flatMap((page) => page.files) || [];
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
  };
}
