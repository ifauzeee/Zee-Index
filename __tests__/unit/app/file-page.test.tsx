import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  getAnyFileDetails: vi.fn(),
  listAllFiles: vi.fn(),
  getVerifiedSession: vi.fn(),
  collectAccessTokens: vi.fn(),
  resolveShareGrant: vi.fn(),
  isAccessRestricted: vi.fn(),
  getPublicAppConfig: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/storage", () => ({
  getAnyFileDetails: mocks.getAnyFileDetails,
  listAllFiles: mocks.listAllFiles,
}));
vi.mock("@/lib/verified-session", () => ({
  getVerifiedSession: mocks.getVerifiedSession,
}));
vi.mock("@/lib/auth", () => ({
  collectAccessTokens: mocks.collectAccessTokens,
}));
vi.mock("@/lib/share-grant", () => ({
  resolveShareGrant: mocks.resolveShareGrant,
  shareGrantToken: (id: string) => `share:${id}`,
}));
vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mocks.isAccessRestricted,
}));
vi.mock("@/lib/app-config", () => ({
  getPublicAppConfig: mocks.getPublicAppConfig,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [{ name: "folder_token_parent", value: "jwt" }],
  }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/components/file-browser/FileDetailClient", () => ({
  default: function FileDetailClient() {
    return null;
  },
}));

import FilePage from "@/app/[locale]/(main)/folder/[folderId]/file/[fileId]/[slug]/page";

const FILE = {
  id: "file-1",
  name: "Report Q3.pdf",
  mimeType: "application/pdf",
  parents: ["parent"],
  owners: [{ displayName: "Owner" }],
  lastModifyingUser: { displayName: "Editor" },
};

function render(
  folderId: string,
  searchParams: Record<string, string> = {},
): Promise<ReactElement> {
  return FilePage({
    params: Promise.resolve({ folderId, fileId: "file-1", locale: "en" }),
    searchParams: Promise.resolve(searchParams),
  }) as Promise<ReactElement>;
}

type Props = Record<string, unknown>;

describe("file page access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedSession.mockResolvedValue(null);
    mocks.collectAccessTokens.mockResolvedValue(["parent"]);
    mocks.resolveShareGrant.mockResolvedValue({
      ok: true,
      record: {},
      itemIds: ["other-file"],
    });
    mocks.isAccessRestricted.mockResolvedValue(false);
    mocks.getPublicAppConfig.mockResolvedValue({ hideAuthor: false });
    mocks.getAnyFileDetails.mockResolvedValue(FILE);
    mocks.listAllFiles.mockResolvedValue({
      files: [
        { id: "file-0", name: "A.pdf", isFolder: false },
        FILE,
        { id: "file-2", name: "C.pdf", isFolder: false },
      ],
    });
  });

  it("checks access against the file, with the tokens from cookies", async () => {
    mocks.isAccessRestricted.mockResolvedValue(true);

    const page = await render("some-public-folder");

    expect((page.props as Props).title).toBe("accessDenied");
    expect(mocks.isAccessRestricted).toHaveBeenCalledWith(
      "file-1",
      ["parent"],
      undefined,
    );
    expect(mocks.getAnyFileDetails).not.toHaveBeenCalled();
  });

  it("does not let an unrelated share token bypass the check", async () => {
    mocks.isAccessRestricted.mockResolvedValue(true);

    const page = await render("parent", { share_token: "any-valid-token" });

    expect((page.props as Props).title).toBe("accessDenied");
  });

  it("lets a share link open the file it was created for", async () => {
    mocks.resolveShareGrant.mockResolvedValue({
      ok: true,
      record: {},
      itemIds: ["file-1"],
    });

    await render("parent", { share_token: "token-for-file-1" });

    expect(mocks.isAccessRestricted).toHaveBeenCalledWith(
      "file-1",
      ["parent", "share:file-1"],
      undefined,
    );
  });

  it("rejects an invalid share token", async () => {
    mocks.resolveShareGrant.mockResolvedValue({ ok: false, reason: "invalid" });

    const page = await render("parent", { share_token: "bad" });

    expect((page.props as Props).message).toBe("invalidShareToken");
  });

  it("redirects to the file's real folder instead of listing the URL folder", async () => {
    await expect(render("other-folder", { view: "true" })).rejects.toThrow(
      "REDIRECT:/en/folder/parent/file/file-1/report-q3.pdf?view=true",
    );
    expect(mocks.listAllFiles).not.toHaveBeenCalled();
  });

  it("renders the file with neighbours from its own folder", async () => {
    const page = await render("parent");
    const props = page.props as Props;

    expect(props.prevFileUrl).toBe("/en/folder/parent/file/file-0/a.pdf");
    expect(props.nextFileUrl).toBe("/en/folder/parent/file/file-2/c.pdf");
    expect(mocks.listAllFiles).toHaveBeenCalledWith(
      expect.objectContaining({ folderId: "parent" }),
    );
  });

  it("strips author data for visitors when hideAuthor is on", async () => {
    mocks.getPublicAppConfig.mockResolvedValue({ hideAuthor: true });

    const page = await render("parent");
    const file = (page.props as Props).file as typeof FILE;

    expect(file.owners).toBeUndefined();
    expect(file.lastModifyingUser).toBeUndefined();
  });

  it("lets admins through without the access check and keeps author data", async () => {
    mocks.getVerifiedSession.mockResolvedValue({
      user: { email: "admin@example.com", role: "ADMIN" },
    });
    mocks.getPublicAppConfig.mockResolvedValue({ hideAuthor: true });

    const page = await render("parent");

    expect(mocks.isAccessRestricted).not.toHaveBeenCalled();
    expect(((page.props as Props).file as typeof FILE).owners).toEqual(
      FILE.owners,
    );
  });
});

describe("file page with path-style ids", () => {
  const LOCAL = {
    id: "local-storage:docs/a b.pdf",
    name: "a b.pdf",
    mimeType: "application/pdf",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedSession.mockResolvedValue(null);
    mocks.collectAccessTokens.mockResolvedValue([]);
    mocks.isAccessRestricted.mockResolvedValue(false);
    mocks.getPublicAppConfig.mockResolvedValue({ hideAuthor: false });
    mocks.getAnyFileDetails.mockResolvedValue(LOCAL);
    mocks.listAllFiles.mockResolvedValue({
      files: [LOCAL, { id: "local-storage:docs/z.pdf", name: "z.pdf" }],
    });
  });

  it("checks access and lists the folder with decoded ids", async () => {
    // Next.js hands route params over still percent-encoded.
    const page = (await FilePage({
      params: Promise.resolve({
        folderId: "local-storage%3Adocs",
        fileId: "local-storage%3Adocs%2Fa%20b.pdf",
        locale: "en",
      }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const props = page.props as Props;

    expect(mocks.isAccessRestricted).toHaveBeenCalledWith(
      "local-storage:docs/a b.pdf",
      [],
      undefined,
    );
    expect(mocks.listAllFiles).toHaveBeenCalledWith(
      expect.objectContaining({ folderId: "local-storage:docs" }),
    );
    expect(props.currentFolderId).toBe("local-storage:docs");
    expect(props.nextFileUrl).toBe(
      "/en/folder/local-storage%3Adocs/file/local-storage%3Adocs%2Fz.pdf/z.pdf",
    );
  });
});
