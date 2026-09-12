"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/errors";
import { useAppStore } from "@/lib/store";

const fetchEmails = async (
  path: string,
  errorMessage: string,
): Promise<string[]> => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(errorMessage);
  const emails: string[] = await response.json();
  return [...emails].sort();
};

export function useAdminEmailsQuery() {
  return useQuery<string[]>({
    queryKey: ["adminEmails"],
    queryFn: () =>
      fetchEmails("/api/admin/users", "Failed to fetch admin list"),
    staleTime: 10_000,
  });
}

export function useEditorEmailsQuery() {
  return useQuery<string[]>({
    queryKey: ["editorEmails"],
    queryFn: () =>
      fetchEmails("/api/admin/editors", "Failed to fetch editor list"),
    staleTime: 10_000,
  });
}

export function useAdminEmailMutation() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({
      email,
      action,
    }: {
      email: string;
      action: "add" | "remove";
    }) => {
      const response = await fetch("/api/admin/users", {
        method: action === "add" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            (action === "add"
              ? "Failed to add admin."
              : "Failed to remove admin."),
        );
      queryClient.invalidateQueries({ queryKey: ["adminEmails"] });
      return result;
    },
    onMutate: async ({ email, action }) => {
      await queryClient.cancelQueries({ queryKey: ["adminEmails"] });
      const previous = queryClient.getQueryData<string[]>(["adminEmails"]);
      queryClient.setQueryData<string[]>(["adminEmails"], (old = []) =>
        action === "add"
          ? [...new Set([...old, email])].sort()
          : old.filter((e) => e !== email),
      );
      return { previous };
    },
    onSuccess: (result) => {
      addToast({ message: result.message, type: "success" });
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(["adminEmails"], context?.previous);
      addToast({
        message: getErrorMessage(error, "Error"),
        type: "error",
      });
    },
  });
}

export function useEditorEmailMutation() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({
      email,
      action,
    }: {
      email: string;
      action: "add" | "remove";
    }) => {
      const response = await fetch("/api/admin/editors", {
        method: action === "add" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            (action === "add"
              ? "Failed to add editor."
              : "Failed to remove editor."),
        );
      queryClient.invalidateQueries({ queryKey: ["editorEmails"] });
      return result;
    },
    onMutate: async ({ email, action }) => {
      await queryClient.cancelQueries({ queryKey: ["editorEmails"] });
      const previous = queryClient.getQueryData<string[]>(["editorEmails"]);
      queryClient.setQueryData<string[]>(["editorEmails"], (old = []) =>
        action === "add"
          ? [...new Set([...old, email])].sort()
          : old.filter((e) => e !== email),
      );
      return { previous };
    },
    onSuccess: (result) => {
      addToast({ message: result.message, type: "success" });
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(["editorEmails"], context?.previous);
      addToast({
        message: getErrorMessage(error, "Error"),
        type: "error",
      });
    },
  });
}
