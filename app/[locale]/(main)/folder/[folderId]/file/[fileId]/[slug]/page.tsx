import { getAnyFileDetails, listAllFiles } from "@/lib/storage";
import FileDetailClient from "@/components/file-browser/FileDetailClient";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/verified-session";
import { collectAccessTokens } from "@/lib/auth";
import { resolveShareGrant, shareGrantToken } from "@/lib/share-grant";
import { isAccessRestricted } from "@/lib/securityUtils";
import { applyAuthorVisibility } from "@/lib/author-visibility";
import type { ZeeFile } from "@/types/storage";
import type { SubtitleTrack } from "@/lib/subtitles";
import { logger } from "@/lib/logger";

const FileError = ({
  message,
  title,
  retry,
}: {
  message: string;
  title: string;
  retry: string;
}) => (
  <div className="text-center py-20 text-muted-foreground">
    <h1 className="text-4xl font-bold">{title}</h1>
    <p className="mt-4 mb-6">{message}</p>
    <a
      href="/"
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium transition-colors"
    >
      {retry}
    </a>
  </div>
);

const createSlug = (name: string) =>
  encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

const trimTrailingSlash = (id: string) => id.replace(/\/+$/, "");

/** Folders that contain `file`: Drive parents, or the path prefix of a path-style id. */
function getContainingFolderIds(file: ZeeFile): string[] {
  if (file.parents?.length) return file.parents;
  const prefixEnd = file.id.indexOf(":") + 1;
  if (prefixEnd === 0) return [];
  const slash = file.id.lastIndexOf("/");
  return [
    slash >= prefixEnd ? file.id.slice(0, slash) : file.id.slice(0, prefixEnd),
  ];
}

export default async function FilePage(props: {
  params: Promise<{ folderId: string; fileId: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const t = await getTranslations("FilePage");
  let file = null;
  let error = null;

  const session = await getVerifiedSession();
  const shareToken = searchParams?.share_token as string | undefined;
  const isAdmin = session?.user?.role === "ADMIN";

  // A share link opens exactly what was shared (Z2-04).
  const shareGrant = shareToken
    ? await resolveShareGrant(shareToken, session)
    : null;
  if (shareGrant && !shareGrant.ok) {
    return (
      <FileError
        title={t("accessDenied")}
        message={t("invalidShareToken")}
        retry={t("goHome")}
      />
    );
  }

  // Decide access from the file itself, exactly like /api/download and
  // /api/filedetails: the folder in the URL is caller-controlled (Z2-03).
  if (!isAdmin) {
    const tokens = [
      ...(await collectAccessTokens((await cookies()).getAll())),
      ...(shareGrant?.ok ? shareGrant.itemIds.map(shareGrantToken) : []),
    ];
    const restricted = await isAccessRestricted(
      params.fileId,
      tokens,
      session?.user?.email,
    );
    if (restricted) {
      return (
        <FileError
          title={t("accessDenied")}
          message={t("noFilePermission")}
          retry={t("goHome")}
        />
      );
    }
  }

  let prevFileUrl: string | undefined = undefined;
  let nextFileUrl: string | undefined = undefined;
  let subtitleTracks: SubtitleTrack[] = [];
  let canonicalUrl: string | null = null;

  try {
    file = await getAnyFileDetails(params.fileId);

    // Only list the URL's folder when the file really lives there; otherwise
    // prev/next and subtitles would expose another folder's contents.
    const containingFolders = file
      ? getContainingFolderIds(file).map(trimTrailingSlash)
      : [];
    const inUrlFolder = containingFolders.includes(
      trimTrailingSlash(params.folderId),
    );
    if (file && !inUrlFolder && file.parents?.length) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(searchParams ?? {})) {
        if (typeof value === "string") query.set(key, value);
      }
      const qs = query.toString();
      canonicalUrl = `/${params.locale}/folder/${file.parents[0]}/file/${
        file.id
      }/${createSlug(file.name)}${qs ? `?${qs}` : ""}`;
    }

    if (file && inUrlFolder) {
      const { files: allFiles } = await listAllFiles({
        folderId: params.folderId,
        pageToken: null,
        pageSize: 1000,
        useCache: true,
      });

      const nonFolderFiles = allFiles.filter((f) => !f.isFolder);
      const currentIndex = nonFolderFiles.findIndex(
        (f) => f.id === params.fileId,
      );

      if (currentIndex > 0) {
        const prevFile = nonFolderFiles[currentIndex - 1];
        prevFileUrl = `/${params.locale}/folder/${params.folderId}/file/${
          prevFile.id
        }/${createSlug(prevFile.name)}`;
      }

      if (currentIndex !== -1 && currentIndex < nonFolderFiles.length - 1) {
        const nextFile = nonFolderFiles[currentIndex + 1];
        nextFileUrl = `/${params.locale}/folder/${params.folderId}/file/${
          nextFile.id
        }/${createSlug(nextFile.name)}`;
      }

      if (file.mimeType.startsWith("video/")) {
        const baseName =
          file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const supportedExtensions = [".vtt", ".srt"];

        const rawTracks = allFiles
          .filter((f) => {
            const fName = f.name.toLowerCase();
            const ext = f.name.substring(f.name.lastIndexOf("."));
            return (
              !f.isFolder &&
              supportedExtensions.includes(ext.toLowerCase()) &&
              fName.startsWith(baseName.toLowerCase())
            );
          })
          .map((trackFile) => {
            const langMatch = trackFile.name.match(/[\._]([a-z]{2,3})[\._]/i);
            const lang = langMatch ? langMatch[1] : "en";
            const label = lang.toUpperCase();

            return {
              src: `/api/download?fileId=${trackFile.id}`,
              kind: "subtitles" as const,
              srcLang: lang,
              label: label,
              default: lang === "en",
            };
          });

        subtitleTracks = Array.from(
          new Map(rawTracks.map((t) => [t.label, t])).values(),
        );
      }
    }
  } catch (err) {
    logger.error({ err }, "Fetch file details error");
    error = t("fetchError");
  }

  if (canonicalUrl) {
    redirect(canonicalUrl);
  }

  if (error) {
    return (
      <FileError message={error} title={t("errorTitle")} retry={t("retry")} />
    );
  }

  if (!file) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <h1 className="text-4xl font-bold">{t("notFoundTitle")}</h1>
        <p className="mt-4 mb-6">{t("notFoundMessage")}</p>
        <a
          href=""
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          {t("retry")}
        </a>
      </div>
    );
  }

  return (
    <FileDetailClient
      file={await applyAuthorVisibility(file, isAdmin)}
      prevFileUrl={prevFileUrl}
      nextFileUrl={nextFileUrl}
      subtitleTracks={subtitleTracks}
      currentFolderId={params.folderId}
    />
  );
}
