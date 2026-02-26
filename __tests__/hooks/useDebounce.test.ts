import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("hooks/useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("debounces value changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } },
    );

    expect(result.current).toBe("initial");

    rerender({ value: "changed", delay: 500 });
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("changed");
  });

  it("resets timer on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    rerender({ value: "b", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "c", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "d", delay: 300 });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("d");
  });

  it("handles zero delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 0 } },
    );

    rerender({ value: "immediate", delay: 0 });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe("immediate");
  });

  it("works with non-string values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 42, delay: 200 } },
    );

    expect(result.current).toBe(42);

    rerender({ value: 100, delay: 200 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(100);
  });

  it("works with object values", () => {
    const initial = { name: "Alice" };
    const updated = { name: "Bob" };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initial, delay: 300 } },
    );

    expect(result.current).toEqual({ name: "Alice" });

    rerender({ value: updated, delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toEqual({ name: "Bob" });
  });
});
