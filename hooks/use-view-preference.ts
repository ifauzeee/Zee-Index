"use client";

import { useState, useEffect } from "react";

type ViewType = "list" | "grid";

export function useViewPreference() {
  const [view, setView] = useState<ViewType>("list");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("zee-view-pref") as ViewType;
    if (saved) setView(saved);
    setIsLoaded(true);
  }, []);

  const toggleView = (newView: ViewType) => {
    setView(newView);
    localStorage.setItem("zee-view-pref", newView);
  };

  return { view, toggleView, isLoaded };
}
