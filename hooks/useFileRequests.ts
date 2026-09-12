"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FileRequestLink } from "@/lib/store";
import { getErrorMessage } from "@/lib/errors";
import { useAppStore } from "@/lib/store";

export function useFileRequestsQuery(enabled = true) {
  return useQuery<FileRequestLink[]>({
    queryKey: ["fileRequests"],
    queryFn: async () => {
      const response = await fetch("/api/file-request");
      if (!response.ok) throw new Error("Failed to fetch request data.");
      const requests: FileRequestLink[] = await response.json();
      return [...requests].sort((a, b) => b.expiresAt - a.expiresAt);
    },
    enabled,
  });
}

export function useRemoveFileRequestMutation() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch("/api/file-request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error("Failed to delete");
      return token;
    },
    onMutate: async (token) => {
      await queryClient.cancelQueries({ queryKey: ["fileRequests"] });
      const previous = queryClient.getQueryData<FileRequestLink[]>([
        "fileRequests",
      ]);
      queryClient.setQueryData<FileRequestLink[]>(
        ["fileRequests"],
        (old = []) => old.filter((r) => r.token !== token),
      );
      return { previous };
    },
    onSuccess: () => {
      addToast({ message: "Request link deleted", type: "success" });
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(["fileRequests"], context?.previous);
      addToast({
        message: getErrorMessage(error, "Failed to delete request link"),
        type: "error",
      });
    },
  });
}
