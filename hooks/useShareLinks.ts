"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShareLink } from "@/lib/store";
import { getErrorMessage } from "@/lib/errors";
import { useAppStore } from "@/lib/store";

const sortByExpiry = (links: ShareLink[]) =>
  [...links].sort(
    (a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime(),
  );

export function useShareLinksQuery(enabled = true) {
  return useQuery<ShareLink[]>({
    queryKey: ["shareLinks"],
    queryFn: async () => {
      const response = await fetch("/api/share/list");
      if (!response.ok) throw new Error("Failed to fetch share link list.");
      const links: ShareLink[] = await response.json();
      return sortByExpiry(links);
    },
    enabled,
  });
}

export function useAddShareLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (link: ShareLink) => link,
    onSuccess: (link) => {
      queryClient.setQueryData<ShareLink[]>(["shareLinks"], (old = []) =>
        sortByExpiry([...old, link]),
      );
    },
  });
}

export function useUpdateShareLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (link: ShareLink) => link,
    onSuccess: (updatedLink) => {
      queryClient.setQueryData<ShareLink[]>(["shareLinks"], (old = []) =>
        old.map((link) => (link.id === updatedLink.id ? updatedLink : link)),
      );
    },
  });
}

export function useRemoveShareLinkMutation() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (linkToRemove: ShareLink) => {
      const response = await fetch("/api/share/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(linkToRemove),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to delete link.");
      return linkToRemove;
    },
    onMutate: async (linkToRemove) => {
      await queryClient.cancelQueries({ queryKey: ["shareLinks"] });
      const previous = queryClient.getQueryData<ShareLink[]>(["shareLinks"]);
      queryClient.setQueryData<ShareLink[]>(["shareLinks"], (old = []) =>
        old.filter((link) => link.id !== linkToRemove.id),
      );
      return { previous };
    },
    onSuccess: () => {
      addToast({ message: "Link successfully deleted.", type: "success" });
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(["shareLinks"], context?.previous);
      addToast({ message: getErrorMessage(error, "Error"), type: "error" });
    },
  });
}
