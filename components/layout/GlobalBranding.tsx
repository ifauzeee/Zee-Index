"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { hexToHsl } from "@/lib/utils";

export default function GlobalBranding() {
  const { primaryColor, appName, faviconUrl } = useAppStore();

  useEffect(() => {
    if (primaryColor) {
      const hsl = hexToHsl(primaryColor);
      document.documentElement.style.setProperty("--primary", hsl);
      document.documentElement.style.setProperty("--ring", hsl);
    } else {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    }

    if (appName) {
      document.title = appName;
    }

    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [primaryColor, appName, faviconUrl]);

  return null;
}
