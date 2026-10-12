import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  getFolderPath: vi.fn(),
  listAllFiles: vi.fn(),
  isAccessRestricted: vi.fn(),
  getAllowedRootIds: vi.fn(),
  isPrivateFolder: vi.fn(),
  findMany: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/drive", () => ({ getFolderPath: mocks.getFolderPath }));
vi.mock("@/lib/storage", () => ({ listAllFiles: mocks.listAllFiles }));
vi.mock("@/lib/storage/providers", () => ({
  getActiveProvider: () => null,
  isProviderId: () => false,
}));
vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mocks.isAccessRestricted,
  getAllowedRootIds: mocks.getAllowedRootIds,
}));
vi.mock("@/lib/auth", () => ({ isPrivateFolder: mocks.isPrivateFolder }));
vi.mock("@/lib/db", () => ({
  db: { protectedFolder: { findMany: mocks.findMany } },
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/components/file-browser/FileBrowser", () => ({
  default: function FileBrowser() {
    return null;
  },
}));

import FolderPage, {
  generateMetadata,
} from "@/app/[locale]/(main)/folder/[folderId]/page";

const PATH = [
  { id: "root-id", name: "Google Drive" },
  { id: "public", name: "Public" },
];

function render(folderId: string): Promise<ReactElement> {
  return FolderPage({
    params: Promise.resolve({ folderId, locale: "en" }),
  }) as Promise<ReactElement>;
}

type Props = Record<string, unknown>;

describe("folder page server render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFolderPath.mockResolvedValue(PATH);
    mocks.isAccessRestricted.mockResolvedValue(false);
    mocks.getAllowedRootIds.mockResolvedValue(new Set(["root-id"]));
    mocks.isPrivateFolder.mockImplementation((id: string) =>
      id.startsWith("private"),
    );
    mocks.findMany.mockResolvedValue([{ folderId: "locked-child" }]);
    mocks.listAllFiles.mockResolvedValue({
      files: [
        { id: "file-1", name: "a.pdf", isFolder: false },
        { id: "locked-child", name: "Locked", isFolder: true },
        { id: "private-child", name: "Hidden", isFolder: true },
      ],
      nextPageToken: null,
    });
  });

  it("does not prefetch or name a folder an anonymous visitor cannot open", async () => {
    // e.g. a subfolder of a protected folder, which is not protected itself.
    mocks.isAccessRestricted.mockResolvedValue(true);

    const page = await render("public");
    const props = page.props as Props;

    expect(mocks.listAllFiles).not.toHaveBeenCalled();
    expect(props.initialFiles).toBeUndefined();
    expect(props.initialFolderPath).toBeUndefined();
  });

  it("returns 404 for a Drive folder outside the allowed roots", async () => {
    mocks.getFolderPath.mockResolvedValue([
      { id: "my-drive-root", name: "My Drive" },
    ]);

    await expect(render("my-drive-root")).rejects.toThrow("NOT_FOUND");
    expect(mocks.listAllFiles).not.toHaveBeenCalled();
  });

  it("does not prefetch a locked local-storage folder", async () => {
    mocks.isAccessRestricted.mockResolvedValue(true);

    const page = await render("local-storage:secret");

    expect(mocks.getAllowedRootIds).not.toHaveBeenCalled();
    expect(mocks.listAllFiles).not.toHaveBeenCalled();
    expect((page.props as Props).initialFiles).toBeUndefined();
  });

  it("prefetches an open folder with the same child rules as /api/files", async () => {
    const page = await render("public");
    const props = page.props as Props;

    expect(props.initialFolderPath).toEqual(PATH);
    expect(props.initialFiles).toEqual([
      { id: "file-1", name: "a.pdf", isFolder: false, isProtected: false },
      { id: "locked-child", name: "Locked", isFolder: true, isProtected: true },
    ]);
  });
});

describe("folder page metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFolderPath.mockResolvedValue([
      ...PATH,
      { id: "payroll", name: "Payroll 2026" },
    ]);
  });

  it("does not put a restricted folder's name in the title", async () => {
    mocks.isAccessRestricted.mockResolvedValue(true);

    const metadata = await generateMetadata({
      params: Promise.resolve({ folderId: "payroll", locale: "en" }),
    });

    expect(String(metadata.title)).not.toContain("Payroll");
    expect(mocks.getFolderPath).not.toHaveBeenCalled();
  });

  it("names an open folder", async () => {
    mocks.isAccessRestricted.mockResolvedValue(false);

    const metadata = await generateMetadata({
      params: Promise.resolve({ folderId: "payroll", locale: "en" }),
    });

    expect(String(metadata.title)).toContain("Payroll 2026");
  });
});
