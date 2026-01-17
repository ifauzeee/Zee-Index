import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock("framer-motion", () => {
  const React = require("react");
  return {
    motion: {
      div: React.forwardRef(function MockMotionDiv(
        {
          children,
          ...props
        }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.ForwardedRef<HTMLDivElement>,
      ) {
        return React.createElement("div", { ref, ...props }, children);
      }),
      button: React.forwardRef(function MockMotionButton(
        {
          children,
          ...props
        }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.ForwardedRef<HTMLButtonElement>,
      ) {
        return React.createElement("button", { ref, ...props }, children);
      }),
    },
    AnimatePresence: function MockAnimatePresence({
      children,
    }: React.PropsWithChildren) {
      return children;
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    dateTime: () => "Jan 15, 2024",
  }),
  useLocale: () => "en",
}));

vi.mock("next/image", () => {
  return {
    default: function MockImage(props: any) {
      return React.createElement("img", props);
    },
  };
});

vi.mock("@/lib/store", () => ({
  useAppStore: () => ({
    view: "list",
    shareToken: null,
    folderTokens: {},
    density: "comfortable",
    favorites: [],
    selectedFiles: [],
    isBulkMode: false,
  }),
}));

vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  const React = require("react");
  return {
    ...actual,
    Lock: function MockLock() {
      return React.createElement("span", { "data-testid": "lock-icon" });
    },
    Star: function MockStar() {
      return React.createElement("span", { "data-testid": "star-icon" });
    },
    Share2: function MockShare2() {
      return React.createElement("span", { "data-testid": "share-icon" });
    },
    Download: function MockDownload() {
      return React.createElement("span", { "data-testid": "download-icon" });
    },
    Info: function MockInfo() {
      return React.createElement("span", { "data-testid": "info-icon" });
    },
    MoreVertical: function MockMoreVertical() {
      return React.createElement("span", { "data-testid": "more-icon" });
    },
    File: function MockFile() {
      return React.createElement("span", { "data-testid": "file-icon" });
    },
    Folder: function MockFolder() {
      return React.createElement("span", { "data-testid": "folder-icon" });
    },
  };
});

import FileItem from "@/components/file-browser/FileItem";

describe("FileItem", () => {
  const mockFile = {
    id: "file-123",
    name: "test-document.pdf",
    mimeType: "application/pdf",
    size: "1048576",
    modifiedTime: "2024-01-15T10:00:00Z",
    createdTime: "2024-01-01T10:00:00Z",
    isFolder: false,
    hasThumbnail: false,
    webViewLink: "https://drive.google.com/file/d/file-123",
    trashed: false,
    isFavorite: false,
  };

  const defaultProps = {
    file: mockFile,
    onClick: vi.fn(),
    onContextMenu: vi.fn(),
    onShare: vi.fn(),
    onShowDetails: vi.fn(),
    onDownload: vi.fn(),
    onDragStart: vi.fn(),
    onFileDrop: vi.fn(),
    onMouseEnter: vi.fn(),
    isActive: false,
    isSelected: false,
    isBulkMode: false,
    isAdmin: false,
    density: "comfortable" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders file name correctly", () => {
    render(<FileItem {...defaultProps} />);
    expect(screen.getByText("test-document.pdf")).toBeInTheDocument();
  });

  it("renders folder name correctly", () => {
    const folderFile = {
      ...mockFile,
      id: "folder-456",
      name: "My Documents",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
    };
    render(<FileItem {...defaultProps} file={folderFile} />);
    expect(screen.getByText("My Documents")).toBeInTheDocument();
  });

  it("shows file size for non-folder items", () => {
    render(<FileItem {...defaultProps} />);
    expect(screen.getByText(/1.*MB/i)).toBeInTheDocument();
  });

  it("shows favorite star when file is favorite", () => {
    const favoriteFile = { ...mockFile, isFavorite: true };
    render(<FileItem {...defaultProps} file={favoriteFile} />);
    expect(screen.getByTestId("star-icon")).toBeInTheDocument();
  });

  it("shows checkbox in bulk mode", () => {
    render(<FileItem {...defaultProps} isBulkMode={true} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
  });

  it("checkbox is checked when selected", () => {
    render(<FileItem {...defaultProps} isBulkMode={true} isSelected={true} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });
});
