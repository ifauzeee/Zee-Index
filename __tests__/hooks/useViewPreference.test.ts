import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewPreference } from "@/hooks/use-view-preference";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("hooks/useViewPreference", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("defaults to list view", () => {
    const { result } = renderHook(() => useViewPreference());
    expect(result.current.view).toBe("list");
  });

  it("loads saved preference from localStorage", () => {
    localStorageMock.getItem.mockReturnValueOnce("grid");
    const { result } = renderHook(() => useViewPreference());

    expect(result.current.isLoaded).toBe(true);
  });

  it("toggles view and persists to localStorage", () => {
    const { result } = renderHook(() => useViewPreference());

    act(() => {
      result.current.toggleView("grid");
    });

    expect(result.current.view).toBe("grid");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "zee-view-pref",
      "grid",
    );
  });

  it("toggles back to list view", () => {
    const { result } = renderHook(() => useViewPreference());

    act(() => {
      result.current.toggleView("grid");
    });
    act(() => {
      result.current.toggleView("list");
    });

    expect(result.current.view).toBe("list");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "zee-view-pref",
      "list",
    );
  });

  it("sets isLoaded to true after mount", () => {
    const { result } = renderHook(() => useViewPreference());
    expect(result.current.isLoaded).toBe(true);
  });
});
