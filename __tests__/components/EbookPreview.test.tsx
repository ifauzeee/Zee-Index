import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEPub, mockDisplay, mockRenderTo, mockDestroy } = vi.hoisted(() => {
  const mockDisplay = vi.fn();
  const mockRenderTo = vi.fn(() => ({ display: mockDisplay }));
  const mockDestroy = vi.fn();
  return {
    mockDisplay,
    mockRenderTo,
    mockDestroy,
    mockEPub: vi.fn(() => ({ renderTo: mockRenderTo, destroy: mockDestroy })),
  };
});

vi.mock("epubjs", () => ({ default: mockEPub }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { EbookPreview } from "@/components/file-details/PreviewRenderers";

describe("EbookPreview (Z2-23)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDisplay.mockResolvedValue(undefined);
  });

  it("loads epub.js on demand and opens the extensionless download URL as an EPUB", async () => {
    const { unmount } = render(<EbookPreview src="/api/download?fileId=abc" />);

    await waitFor(() => expect(mockDisplay).toHaveBeenCalled());
    expect(mockEPub).toHaveBeenCalledWith("/api/download?fileId=abc", {
      openAs: "epub",
    });
    // Book content is untrusted: its scripts must never run.
    expect(mockRenderTo).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
      width: "100%",
      height: "100%",
      allowScriptedContent: false,
    });

    unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it("shows the error when the book cannot be displayed", async () => {
    mockDisplay.mockRejectedValue(new Error("Invalid EPUB"));

    render(<EbookPreview src="/api/download?fileId=broken" />);

    expect(await screen.findByText("Invalid EPUB")).toBeTruthy();
  });
});
