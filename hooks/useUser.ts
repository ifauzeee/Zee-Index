"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore, UserProfile } from "@/lib/store";

function useUserQuery(refreshKey = 0) {
  const { status } = useSession();

  return useQuery<UserProfile | null>({
    queryKey: ["user", refreshKey],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.user ?? null;
    },
    enabled: status === "authenticated",
  });
}

export function useUser() {
  const refreshKey = useAppStore((state) => state.refreshKey);
  const { data } = useUserQuery(refreshKey);
  return data ?? null;
}
