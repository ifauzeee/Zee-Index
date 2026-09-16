"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/errors";
import { useAppStore } from "@/lib/store";
import type { AppConfig } from "@/lib/app-config.shared";

interface PublicConfig {
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  hideAuthor: boolean | null;
}

const PUBLIC_DEFAULTS: PublicConfig = {
  appName: "Zee Index",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "",
  hideAuthor: null,
};

function usePublicConfigQuery() {
  return useQuery<PublicConfig>({
    queryKey: ["publicConfig"],
    queryFn: async () => {
      const response = await fetch("/api/config");
      if (!response.ok) throw new Error("Failed to fetch public config");
      const config = await response.json();
      return {
        appName: config.appName || PUBLIC_DEFAULTS.appName,
        logoUrl: config.logoUrl || "",
        faviconUrl: config.faviconUrl || "",
        primaryColor: config.primaryColor || "",
        hideAuthor: config.hideAuthor ?? null,
      };
    },
    staleTime: 60_000,
  });
}

export function usePublicConfig() {
  const { data } = usePublicConfigQuery();
  return { ...PUBLIC_DEFAULTS, ...data };
}

export function useAdminConfigQuery() {
  return useQuery<AppConfig>({
    queryKey: ["adminConfig"],
    queryFn: async () => {
      const response = await fetch("/api/admin/config");
      if (!response.ok) throw new Error("Failed to fetch admin config");
      return await response.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateConfigMutation() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (config: Partial<AppConfig>) => {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Update failed: ${response.status}`);
      }
      const result = await response.json();
      return result.config as AppConfig;
    },
    onMutate: async (config) => {
      await queryClient.cancelQueries({ queryKey: ["adminConfig"] });
      const previous = queryClient.getQueryData<AppConfig>(["adminConfig"]);
      queryClient.setQueryData<AppConfig | undefined>(["adminConfig"], (old) =>
        old ? { ...old, ...config } : undefined,
      );
      return { previous };
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(["adminConfig"], updatedConfig);
      queryClient.invalidateQueries({ queryKey: ["publicConfig"] });
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(["adminConfig"], context?.previous);
      addToast({
        message: getErrorMessage(error, "Error updating config"),
        type: "error",
      });
    },
  });
}
