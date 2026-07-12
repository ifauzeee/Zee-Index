import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

vi.mock("@/lib/logger", () => {
  return {
    logger: {
      info: vi.fn((...args) => console.log(...args)),
      error: vi.fn((...args) => console.error(...args)),
      warn: vi.fn((...args) => console.warn(...args)),
      debug: vi.fn((...args) => console.log(...args)),
    },
  };
});
