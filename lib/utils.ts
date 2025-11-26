import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  File as FileIcon,
  Video,
  Image,
  Music,
  Archive,
  LucideIcon,
  Folder,
  FileText,
  Sheet,
  Presentation,
} from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getIcon(mimeType: string): LucideIcon {
  if (typeof mimeType !== "string") return FileIcon;
  if (mimeType === "application/vnd.google-apps.folder") return Folder;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (
    mimeType.startsWith("application/zip") ||
    mimeType.startsWith("application/x-rar-compressed") ||
    mimeType.startsWith("application/x-7z-compressed") ||
    mimeType.startsWith("application/x-tar")
  )
    return Archive;
  if (
    mimeType.startsWith("text/plain") ||
    mimeType.startsWith("text/markdown") ||
    mimeType.includes("document") ||
    mimeType.includes("wordprocessing")
  )
    return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("sheet"))
    return Sheet;
  if (mimeType.includes("presentation")) return Presentation;

  return FileIcon;
}

export const formatDuration = (seconds: number | string): string => {
  const numericSeconds = Number(seconds);
  if (isNaN(numericSeconds) || numericSeconds < 0) return "00:00";

  const hours = Math.floor(numericSeconds / 3600);
  const minutes = Math.floor((numericSeconds % 3600) / 60);
  const remainingSeconds = Math.floor(numericSeconds % 60);

  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  if (hours > 0) {
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }
  return `${formattedMinutes}:${formattedSeconds}`;
};

export function getFileType(file: { mimeType: string; name: string }): string {
  const mimeType = file.mimeType || "";
  const name = file.name.toLowerCase();

  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";

  if (mimeType === "text/markdown" || name.endsWith(".md")) return "markdown";

  if (mimeType === "text/plain" || name.endsWith(".txt")) return "text";

  if (
    mimeType.startsWith("application/zip") ||
    name.endsWith(".zip") ||
    name.endsWith(".rar") ||
    name.endsWith(".7z")
  )
    return "archive";
  if (
    mimeType.includes("officedocument.wordprocessingml") ||
    name.endsWith(".docx")
  )
    return "office";
  if (
    mimeType.includes("officedocument.spreadsheetml") ||
    name.endsWith(".xlsx")
  )
    return "office";
  if (
    mimeType.includes("officedocument.presentationml") ||
    name.endsWith(".pptx")
  )
    return "office";
  if (mimeType === "application/epub+zip" || name.endsWith(".epub"))
    return "ebook";

  const codeExtensions = [
    "js",
    "ts",
    "jsx",
    "tsx",
    "json",
    "py",
    "css",
    "html",
    "sh",
    "java",
    "c",
    "cpp",
    "cs",
    "go",
    "rb",
    "php",
    "swift",
    "kt",
    "rs",
  ];
  const fileExtension = name.split(".").pop();
  if (fileExtension && codeExtensions.includes(fileExtension)) {
    return "code";
  }

  return "other";
}

export function getGoogleDriveLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function getGoogleEditorLink(
  fileId: string,
  mimeType: string,
): string | null {
  if (
    mimeType.includes("document") ||
    mimeType.includes("wordprocessingml") ||
    mimeType === "application/vnd.google-apps.document"
  ) {
    return `https://docs.google.com/document/d/${fileId}/edit`;
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("sheet") ||
    mimeType === "application/vnd.google-apps.spreadsheet"
  ) {
    return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
  }
  if (
    mimeType.includes("presentation") ||
    mimeType === "application/vnd.google-apps.presentation"
  ) {
    return `https://docs.google.com/presentation/d/${fileId}/edit`;
  }
  return null;
}

export function getLanguageFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    json: "json",
    py: "python",
    css: "css",
    html: "html",
    md: "markdown",
    txt: "text",
    sh: "bash",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    rs: "rust",
  };
  return langMap[ext] || "clike";
}

export const MASONRY_BREAKPOINTS = {
  default: 5,
  1536: 5, 
  1280: 4, 
  1024: 3,
  768: 2, 
  640: 1, 
};