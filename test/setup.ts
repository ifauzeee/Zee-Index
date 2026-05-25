import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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
