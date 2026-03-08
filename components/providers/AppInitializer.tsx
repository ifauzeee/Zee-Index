"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { ReactNode } from "react";

export function AppInitializer({ children }: { children: ReactNode }) {
  useNotifications();

  return <>{children}</>;
}
