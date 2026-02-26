import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useScrollLock } from "@/hooks/useScrollLock";

describe("hooks/useScrollLock", () => {
  beforeEach(() => {
    document.body.classList.remove("scroll-locked");
  });

  it("adds scroll-locked class when locked", () => {
    renderHook(() => useScrollLock(true));
    expect(document.body.classList.contains("scroll-locked")).toBe(true);
  });

  it("does not add class when not locked", () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.classList.contains("scroll-locked")).toBe(false);
  });

  it("defaults to locked", () => {
    renderHook(() => useScrollLock());
    expect(document.body.classList.contains("scroll-locked")).toBe(true);
  });

  it("removes class on unmount", () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.classList.contains("scroll-locked")).toBe(true);

    unmount();
    expect(document.body.classList.contains("scroll-locked")).toBe(false);
  });

  it("toggles class when prop changes", () => {
    const { rerender } = renderHook(({ locked }) => useScrollLock(locked), {
      initialProps: { locked: true },
    });

    expect(document.body.classList.contains("scroll-locked")).toBe(true);

    rerender({ locked: false });
    expect(document.body.classList.contains("scroll-locked")).toBe(false);
  });
});
