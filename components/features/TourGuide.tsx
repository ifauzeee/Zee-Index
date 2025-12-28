"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/app/[locale]/(main)/driver-theme.css";
import { useTranslations } from "next-intl";

export default function TourGuide() {
  const t = useTranslations("TourGuide");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: t("done"),
      nextBtnText: t("next"),
      prevBtnText: t("prev"),
      progressText: "{{current}} / {{total}}",
      popoverClass: "driverjs-theme",
      steps:
        window.innerWidth < 640
          ? [
              {
                element: "#app-container",
                popover: {
                  title: t("steps.welcome.title"),
                  description: t("steps.welcome.description"),
                  side: "bottom",
                  align: "center",
                },
              },
              {
                element: "#header-sidebar-toggle",
                popover: {
                  title: t("steps.navigation.title"),
                  description: t("steps.navigation.description"),
                  side: "bottom",
                  align: "start",
                },
              },
              {
                element: "#header-mobile-search",
                popover: {
                  title: t("steps.search.title"),
                  description: t("steps.search.description"),
                  side: "bottom",
                  align: "end",
                },
              },
              {
                element: "#header-mobile-notifications",
                popover: {
                  title: t("steps.notifications.title"),
                  description: t("steps.notifications.description"),
                  side: "bottom",
                  align: "end",
                },
              },
              {
                element: "#header-mobile-menu",
                popover: {
                  title: t("steps.mobileMenu.title"),
                  description: t("steps.mobileMenu.description"),
                  side: "bottom",
                  align: "end",
                },
              },
            ]
          : [
              {
                element: "#app-container",
                popover: {
                  title: t("steps.welcome.title"),
                  description: t("steps.welcome.description"),
                  side: "bottom",
                  align: "center",
                },
              },
              {
                element: "#sidebar-nav-home",
                popover: {
                  title: t("steps.navigation.title"),
                  description: t("steps.navigation.description"),
                  side: "right",
                  align: "center",
                },
              },
              {
                element: "#sidebar-explorer-tree",
                popover: {
                  title: t("steps.explorer.title"),
                  description: t("steps.explorer.description"),
                  side: "right",
                  align: "center",
                },
              },
              {
                element: "#header-search-bar",
                popover: {
                  title: t("steps.search.title"),
                  description: t("steps.search.description"),
                  side: "bottom",
                  align: "center",
                },
              },
              {
                element: "#header-notifications-btn",
                popover: {
                  title: t("steps.notifications.title"),
                  description: t("steps.notifications.description"),
                  side: "bottom",
                  align: "end",
                },
              },
              {
                element: "#header-btn-theme",
                popover: {
                  title: t("steps.theme.title"),
                  description: t("steps.theme.description"),
                  side: "bottom",
                  align: "end",
                },
              },
              {
                element: "#header-btn-refresh",
                popover: {
                  title: t("steps.refresh.title"),
                  description: t("steps.refresh.description"),
                  side: "bottom",
                  align: "end",
                },
              },
              {
                element: "#header-btn-github",
                popover: {
                  title: t("steps.github.title"),
                  description: t("steps.github.description"),
                  side: "bottom",
                  align: "end",
                },
              },
            ],
      onDestroyed: () => {
        localStorage.setItem("zee-index-tour-seen", "true");
      },
    });

    const startTour = () => {
      driverObj.drive();
    };

    const hasSeenTour = localStorage.getItem("zee-index-tour-seen");
    if (!hasSeenTour) {
      const timer = setTimeout(startTour, 1500);
      return () => clearTimeout(timer);
    }

    const handleManualStart = () => {
      startTour();
    };

    window.addEventListener("start-tour", handleManualStart);
    return () => window.removeEventListener("start-tour", handleManualStart);
  }, [mounted, t]);

  return null;
}
