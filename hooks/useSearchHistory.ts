"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "zee-search-history";
const MAX_HISTORY = 20;

interface SearchHistoryItem {
  query: string;
  searchType: "name" | "fullText";
  timestamp: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SearchHistoryItem[];
        setHistory(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persist = useCallback((items: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, []);

  const addToHistory = useCallback(
    (query: string, searchType: "name" | "fullText" = "name") => {
      if (!query.trim()) return;

      setHistory((prev) => {
        const filtered = prev.filter(
          (item) => item.query.toLowerCase() !== query.trim().toLowerCase(),
        );
        const newHistory = [
          { query: query.trim(), searchType, timestamp: Date.now() },
          ...filtered,
        ].slice(0, MAX_HISTORY);

        persist(newHistory);
        return newHistory;
      });
    },
    [persist],
  );

  const removeFromHistory = useCallback(
    (query: string) => {
      setHistory((prev) => {
        const filtered = prev.filter(
          (item) => item.query.toLowerCase() !== query.toLowerCase(),
        );
        persist(filtered);
        return filtered;
      });
    },
    [persist],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getSuggestions = useCallback(
    (input: string, limit = 5): SearchHistoryItem[] => {
      if (!input.trim()) {
        return history.slice(0, limit);
      }
      return history
        .filter((item) =>
          item.query.toLowerCase().includes(input.toLowerCase()),
        )
        .slice(0, limit);
    },
    [history],
  );

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getSuggestions,
  };
}
