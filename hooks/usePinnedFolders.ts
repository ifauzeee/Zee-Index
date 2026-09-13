"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DriveFile } from "@/lib/drive";
import { getErrorMessage } from "@/lib/errors";
import { useAppStore } from "@/lib/store";
import { getPinnedFolders, addPin, removePin } from "@/app/actions/pinned";

export function usePinnedFoldersQuery() {
  return useQuery<DriveFile[]>({
    queryKey: ["pinnedFolders"],
    queryFn: getPinnedFolders,
  });
}

export function usePinnedMutation() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({
      folderId,
      action,
    }: {
      folderId: string;
      action: "add" | "remove";
    }) => {
      return action === "add"
        ? await addPin(folderId)
        : await removePin(folderId);
    },
    onSuccess: (result) => {
      addToast({ message: result.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["pinnedFolders"] });
    },
    onError: (error) => {
      addToast({ message: getErrorMessage(error, "Error"), type: "error" });
    },
  });
}
