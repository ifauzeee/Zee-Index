import { getFileDetailsFromDrive, listFilesFromDrive } from "@/lib/drive";
import FileDetailClient from "@/components/file-browser/FileDetailClient";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import {
  isPrivateFolder,
  isProtected,
  hasUserAccess,
  verifyShareTokenString,
} from "@/lib/auth";

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

interface SubtitleTrack {
  src: string;
  kind: string;
  srcLang: string;
  label: string;
  default: boolean;
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

  const session = await getServerSession(authOptions);
  const shareToken = searchParams?.share_token as string | undefined;

  if (shareToken) {
    const isValidShare = await verifyShareTokenString(shareToken);
    if (!isValidShare) {
      return (
        <FileError
          title="Access Denied"
          message="Invalid share token or login required."
          retry="Go Home"
        />
      );
    }
  } else {
    const folderId = params.folderId;
    const isPriv = isPrivateFolder(folderId);
    const isProt = await isProtected(folderId);
    const userEmail = session?.user?.email;
    const isAdmin = session?.user?.role === "ADMIN";

    let hasAccess = false;
    if (isAdmin) {
      hasAccess = true;
    } else if (userEmail && (await hasUserAccess(userEmail, folderId))) {
      hasAccess = true;
    } else if (!isPriv && !isProt) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return (
        <FileError
          title="Access Denied"
          message="You do not have permission to view this file."
          retry="Go Home"
        />
      );
    }
  }

  let prevFileUrl: string | undefined = undefined;
  let nextFileUrl: string | undefined = undefined;
  let subtitleTracks: SubtitleTrack[] = [];

  try {
    file = await getFileDetailsFromDrive(params.fileId);

    if (file && params.folderId) {
      const { files: allFiles } = await listFilesFromDrive(
        params.folderId,
        null,
        1000,
      );

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
              kind: "subtitles",
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
    console.error("Fetch file details error:", err);
    error = t("fetchError");
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
      file={file}
      prevFileUrl={prevFileUrl}
      nextFileUrl={nextFileUrl}
      subtitleTracks={subtitleTracks}
    />
  );
}
