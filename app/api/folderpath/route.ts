import { NextResponse, NextRequest } from "next/server";
import { getAccessToken } from "@/lib/drive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { validateShareToken } from "@/lib/auth";
import { kv } from "@/lib/kv";

export const dynamic = "force-dynamic";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 404 || response.status === 401) return response;
      if (response.status >= 500) {
        await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
  throw new Error("Fetch failed after retries");
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
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
      { error: "Authentication required." },
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

  const cacheKey = `zee-index:folder-path-v7:${folderId}:${locale}`;

  try {
    const cachedPath: { id: string; name: string }[] | null =
      await kv.get(cacheKey);
    if (cachedPath) {
      return NextResponse.json(cachedPath);
    }
  } catch (e) {
    console.error("Cache fetch error", e);
  }

  try {
    const dbDrivesRaw = await kv.get("zee-index:manual-drives");
    const dbDrives: any[] = Array.isArray(dbDrivesRaw) ? dbDrivesRaw : [];

    const envDrives = (process.env.NEXT_PUBLIC_MANUAL_DRIVES || "")
      .split(",")
      .reduce<string[]>((acc, entry) => {
        const [id] = entry.split(":");
        if (id?.trim()) acc.push(id.trim());
        return acc;
      }, []);

    const shortcutMap = new Map<string, string>();

    if (process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) {
      shortcutMap.set(
        process.env.NEXT_PUBLIC_ROOT_FOLDER_ID.trim(),
        process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME ||
          (locale === "id" ? "Beranda" : "Home"),
      );
    }

    envDrives.forEach((id) => {
      if (id?.trim()) shortcutMap.set(id.trim(), "");
    });

    dbDrives.forEach((d) => {
      if (d && d.id) shortcutMap.set(d.id.trim(), d.name || "");
    });

    const accessToken = await getAccessToken();
    const driveFallback = locale === "id" ? "Drive Bersama" : "Shared Drive";

    if (shortcutMap.has(folderId)) {
      try {
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name&supportsAllDrives=true`;
        const response = await fetchWithRetry(driveUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          const customName = shortcutMap.get(folderId) || data.name;
          const result = [{ id: data.id, name: customName }];
          await kv.set(cacheKey, result, { ex: 3600 });
          return NextResponse.json(result);
        }
      } catch (err) {
        console.error("Error fetching shortcut metadata", err);
      }

      const result = [
        { id: folderId, name: shortcutMap.get(folderId) || driveFallback },
      ];
      return NextResponse.json(result);
    }

    const path: { id: string; name: string }[] = [];
    let currentId = folderId;
    let iterations = 0;

    while (currentId && iterations < 20) {
      iterations++;

      if (shortcutMap.has(currentId)) {
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${currentId}?fields=id,name&supportsAllDrives=true`;
        const response = await fetchWithRetry(driveUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          const displayName = shortcutMap.get(currentId) || data.name;
          path.unshift({ id: data.id, name: displayName });
        } else {
          path.unshift({
            id: currentId,
            name: shortcutMap.get(currentId) || driveFallback,
          });
        }
        break;
      }

      const driveUrl = `https://www.googleapis.com/drive/v3/files/${currentId}?fields=id,name,parents&supportsAllDrives=true`;
      const response = await fetchWithRetry(driveUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!response.ok) break;

      const data = await response.json();
      path.unshift({ id: data.id, name: data.name });

      if (data.parents && data.parents.length > 0) {
        currentId = data.parents[0];
      } else {
        break;
      }
    }

    await kv.set(cacheKey, path, { ex: 3600 });
    return NextResponse.json(path);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal error.";
    return NextResponse.json(
      { error: "Failed to fetch path", details: errorMessage },
      { status: 500 },
    );
  }
}
