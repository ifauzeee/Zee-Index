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
    // Tangkap error 401 Protected secara spesifik
    if (response.status === 401 && errorData.protected) {
      // Throw object khusus agar bisa dideteksi di retry logic
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
  // Jika error folder path, kita biarkan tapi jangan sampai loop
  if (!response.ok) {
    if (response.status === 401) return []; // Return empty path on auth error
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

  // 1. Query untuk Breadcrumb Path
  const { data: historyData } = useQuery({
    queryKey: ["folderPath", currentFolderId, shareToken],
    queryFn: () => fetchFolderPathApi(currentFolderId, shareToken),
    enabled: !!currentFolderId && currentFolderId !== rootFolderId,
    initialData: initialFolderPath,
    // FIX: Jangan retry jika gagal ambil path (misal karena protected)
    retry: false,
    refetchOnWindowFocus: false,
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
    return Array.isArray(historyData) ? historyData : [];
  }, [historyData, currentFolderId, rootFolderId]);

  // 2. Query Utama untuk List File
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
      folderTokens[currentFolderId], // Query key berubah jika token ada
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

    // FIX: Logic Retry yang Lebih Ketat
    retry: (failureCount, error: any) => {
      // JANGAN retry jika errornya adalah Protected Folder (401)
      if (error?.isProtected) return false;
      // Default retry 2 kali untuk error jaringan biasa
      return failureCount < 2;
    },
    // FIX: Matikan refetch otomatis untuk mencegah loop saat user diam
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const files = useMemo(() => {
    return data?.pages.flatMap((page) => page.files) || [];
  }, [data]);

  useEffect(() => {
    if (error) {
      const err = error as any;

      // Jika error protected, jangan tampilkan toast error umum,
      // biarkan AuthModal yang menangani.
      if (err.isProtected) {
        // Silent
      } else {
        addToast({
          message: err.message || "Gagal memuat data.",
          type: "error",
        });

        if (err.message?.includes("Sesi Anda telah berakhir")) {
          router.push("/login?error=SessionExpired");
        }
      }
    }
  }, [error, addToast, router]);

  const authModalInfo = useMemo(() => {
    const err = error as any;
    if (err?.isProtected) {
      return {
        isOpen: true,
        folderId: err.folderId,
        folderName: "Folder Terkunci",
      };
    }
    return null;
  }, [error]);

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
