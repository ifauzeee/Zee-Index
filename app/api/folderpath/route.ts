import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getFolderPath } from "@/lib/drive";
import { collectAccessTokens, validateShareToken } from "@/lib/auth";
import { shareGrantTokens } from "@/lib/share-grant";
import { getAllowedRootIds, redactRestrictedPath } from "@/lib/securityUtils";
import { getActiveProvider, isProviderId } from "@/lib/storage/providers";

export const dynamic = "force-dynamic";

interface PathNode {
  id: string;
  name: string;
}

const PATH_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=60, stale-while-revalidate=600",
};

/** Build breadcrumbs for a path-style id (`<prefix>a/b/`) from the id alone. */
function buildPrefixedPath(
  folderId: string,
  prefix: string,
  root: PathNode,
): PathNode[] {
  const segments = folderId.slice(prefix.length).split("/").filter(Boolean);
  const nodes = [root];
  let currentPath = "";
  for (const segment of segments) {
    currentPath += `${segment}/`;
    nodes.push({ id: `${prefix}${currentPath}`, name: segment });
  }
  return nodes;
}

export const GET = createPublicRoute(
  async ({ request, session }) => {
    const isShareAuth = await validateShareToken(request);

    const { searchParams } = new URL(request.url);
    const rawFolderId = searchParams.get("folderId");
    const locale = searchParams.get("locale") || "en";

    const isPriv = rawFolderId
      ? (process.env.PRIVATE_FOLDER_IDS || "")
          .split(",")
          .includes(rawFolderId.trim())
      : false;

    if (isPriv && !session && !isShareAuth) {
      return NextResponse.json(
        { error: "Authentication required.", protected: true },
        { status: 401 },
      );
    }

    if (!rawFolderId) {
      return NextResponse.json(
        {
          error:
            locale === "id"
              ? "Parameter folderId tidak ditemukan."
              : "Parameter folderId not found.",
        },
        { status: 400 },
      );
    }

    const folderId = decodeURIComponent(rawFolderId)
      .split("&")[0]
      .split("?")[0]
      .trim();

    // Local and provider breadcrumbs are derived from the id the caller
    // already sent, so they reveal nothing new.
    if (folderId === "virtual-root") {
      return NextResponse.json(
        [{ id: "virtual-root", name: locale === "id" ? "Beranda" : "Home" }],
        { headers: PATH_CACHE_HEADERS },
      );
    }

    if (folderId.startsWith("local-storage:")) {
      return NextResponse.json(
        buildPrefixedPath(folderId, "local-storage:", {
          id: "local-storage:",
          name: locale === "id" ? "Penyimpanan Lokal" : "Local Storage",
        }),
        { headers: PATH_CACHE_HEADERS },
      );
    }

    const provider = getActiveProvider();
    if (provider && isProviderId(folderId)) {
      return NextResponse.json(
        buildPrefixedPath(folderId, provider.idPrefix, {
          id: provider.rootId,
          name: provider.rootName,
        }),
        { headers: PATH_CACHE_HEADERS },
      );
    }

    try {
      const path = await getFolderPath(folderId, locale);

      if (session?.user?.role === "ADMIN") {
        return NextResponse.json(path, { headers: PATH_CACHE_HEADERS });
      }

      // A path that does not start at an allowed root belongs to a folder
      // outside the index (e.g. the account's own My Drive): reveal nothing.
      const allowedRoots = await getAllowedRootIds();
      if (path.length === 0 || !allowedRoots.has(path[0].id)) {
        return NextResponse.json(
          {
            error:
              locale === "id" ? "Folder tidak ditemukan." : "Folder not found.",
          },
          { status: 404 },
        );
      }

      // Names of protected folders the caller has not unlocked are hidden;
      // ids stay so the client can still match the folder tokens it holds.
      const bearer = request.headers.get("Authorization")?.split(" ")[1];
      const tokens = [
        ...(await collectAccessTokens(request.cookies.getAll(), bearer)),
        ...(await shareGrantTokens(searchParams.get("share_token"), session)),
      ];
      const visiblePath = await redactRestrictedPath(
        path,
        tokens,
        session?.user?.email,
        locale === "id" ? "Folder terkunci" : "Locked folder",
      );

      return NextResponse.json(visiblePath, { headers: PATH_CACHE_HEADERS });
    } catch (e) {
      logger.error({ err: e }, "[FolderPath] Failed to resolve folder path");
      return NextResponse.json(
        { error: "Failed to fetch path" },
        { status: 500 },
      );
    }
  },
  { includeSession: true, rateLimit: false },
);
