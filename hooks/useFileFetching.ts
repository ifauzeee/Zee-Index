import { useEffect, useMemo } from "react";
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { DriveFile } from "@/lib/drive";
import {
  ErrorResponsePayload,
  RequestError,
  getErrorMessage,
} from "@/lib/errors";

interface FolderPathItem {
  id: string;
  name: string;
}

interface FilesResponse {
  files: DriveFile[];
  nextPageToken?: string | null;
}

interface UseFileFetchingProps {
  initialFolderId?: string;
  initialFolderPath?: FolderPathItem[];
  shareToken: string | null;
  folderTokens: Record<string, string>;
  addToast: (toast: { message: string; type: "error" | "info" }) => void;
  router: AppRouterInstance;
  refreshKey: number;
  locale: string;
}

export class ProtectedError extends RequestError {
  constructor(message: string, folderId: string) {
    super(message, {
      status: 401,
      isProtected: true,
      folderId,
    });
    this.name = "ProtectedError";
  }
}

function createRequestError(
  payload: ErrorResponsePayload,
  status: number,
  fallbackMessage: string,
  folderId: string,
): RequestError {
  return new RequestError(payload.error || fallbackMessage, {
    status,
    isProtected: payload.protected ?? false,
    folderId: payload.folderId || folderId,
  });
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
}): Promise<FilesResponse> => {
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
    const errorData: ErrorResponsePayload = await response
      .json()
      .catch(() => ({}));
    if (response.status === 401 && errorData.protected) {
      throw new ProtectedError(
        errorData.error || "Folder membutuhkan autentikasi.",
        folderId,
      );
    }
    throw createRequestError(
      errorData,
      response.status,
      "Gagal mengambil data file.",
      folderId,
    );
  }

  return response.json() as Promise<FilesResponse>;
};

export const fetchFolderPathApi = async (
  folderId: string,
  shareToken?: string | null,
  locale?: string,
): Promise<FolderPathItem[]> => {
  const url = new URL(window.location.origin + "/api/folderpath");
  url.searchParams.append("folderId", folderId);
  if (shareToken) url.searchParams.append("share_token", shareToken);
  if (locale) url.searchParams.append("locale", locale);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorData: ErrorResponsePayload = await response
      .json()
      .catch(() => ({}));
    throw createRequestError(
      errorData,
      response.status,
      "Gagal mengambil data folder.",
      folderId,
    );
  }
  return response.json() as Promise<FolderPathItem[]>;
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
  initialFiles?: DriveFile[];
  initialNextPageToken?: string | null;
}) {
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;
  const currentFolderId = initialFolderId || rootFolderId;

  const queryClient = useQueryClient();

  useEffect(() => {
    if (refreshKey > 0) {
      queryClient.invalidateQueries({
        queryKey: ["folderPath", currentFolderId],
      });
      queryClient.invalidateQueries({ queryKey: ["files", currentFolderId] });
    }
  }, [refreshKey, currentFolderId, queryClient]);

  const { data: historyData } = useQuery<FolderPathItem[], RequestError>({
    queryKey: ["folderPath", currentFolderId, shareToken, locale],
    queryFn: () => fetchFolderPathApi(currentFolderId, shareToken, locale),
    enabled: !!currentFolderId && currentFolderId !== rootFolderId,
    initialData: initialFolderPath,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5,
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
  } = useInfiniteQuery<
    FilesResponse,
    RequestError,
    InfiniteData<FilesResponse>,
    readonly [string, string, string | null, string | undefined],
    string | null
  >({
    queryKey: ["files", currentFolderId, shareToken, bestToken],
    queryFn: ({ pageParam }) =>
      fetchFilesApi({
        folderId: currentFolderId,
        pageToken: pageParam,
        shareToken,
        folderToken: bestToken,
        refresh: refreshKey > 0,
      }),
    initialPageParam: null,
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
    retry: (failureCount, requestError) => {
      if (
        requestError instanceof ProtectedError ||
        requestError.isProtected ||
        requestError.status === 401
      ) {
        return false;
      }
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
      if (error.isProtected) {
        return;
      }

      addToast({
        message: getErrorMessage(error, "Gagal memuat data."),
        type: "error",
      });

      if (error.message.includes("Sesi Anda telah berakhir")) {
        router.push("/login?error=SessionExpired");
      }

      if (error.message === "ShareLinkExpired") {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("share_token");
        router.push(
          `/login?error=ShareLinkExpired&callbackUrl=${encodeURIComponent(
            currentUrl.pathname + currentUrl.search,
          )}`,
        );
      }

      if (error.status === 401 && !error.isProtected) {
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
    if (error?.isProtected && error.folderId) {
      const folderName =
        history.find((folder) => folder.id === error.folderId)?.name ||
        "Folder Terkunci";

      return {
        isOpen: true,
        folderId: error.folderId,
        folderName,
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
