"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { DriveFile } from "@/lib/drive";
import { getErrorMessage } from "@/lib/errors";
import { useAppStore } from "@/lib/store";
import { useUser } from "@/hooks/useUser";
import {
  addFavorite,
  getFavorites,
  removeFavorite,
} from "@/app/actions/favorites";

export function useFavoritesQuery() {
  const { data: session } = useSession();
  const user = useUser();

  return useQuery<DriveFile[]>({
    queryKey: ["favorites"],
    queryFn: getFavorites,
    enabled: !!session?.user && !user?.isGuest,
  });
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({
      fileId,
      isCurrentlyFavorite,
    }: {
      fileId: string;
      isCurrentlyFavorite: boolean;
    }) => {
      return isCurrentlyFavorite ? removeFavorite(fileId) : addFavorite(fileId);
    },
    onSuccess: (result) => {
      addToast({ message: result.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: (error) => {
      addToast({ message: getErrorMessage(error, "Error"), type: "error" });
    },
  });
}
