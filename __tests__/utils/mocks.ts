import { vi } from "vitest";

export const mockNavigation = () => {
  vi.mock("next/navigation", () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    notFound: vi.fn(),
    redirect: vi.fn(),
  }));
};

export const mockConsoleError = () => {
  const originalError = console.error;
  console.error = vi.fn();
  return () => {
    console.error = originalError;
  };
};
