import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { File as FileIcon, Video, Image, Music, Archive, LucideIcon, Folder } from "lucide-react";

export interface DriveFile {
  mimeType: string;
  name: string;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function getIcon(mimeType: string): LucideIcon {
  if (typeof mimeType !== 'string') return FileIcon;
  if (mimeType === 'application/vnd.google-apps.folder') return Folder;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.startsWith("application/zip") || mimeType.startsWith("application/x-rar-compressed")) return Archive;
  return FileIcon;
}

export const formatDuration = (seconds: number | string): string => {
   const numericSeconds = Number(seconds);
   if (isNaN(numericSeconds) || numericSeconds < 0) return "00:00";
   
   const hours = Math.floor(numericSeconds / 3600);
   const minutes = Math.floor((numericSeconds % 3600) / 60);
   const remainingSeconds = Math.floor(numericSeconds % 60);

   const formattedHours = String(hours).padStart(2, '0');
   const formattedMinutes = String(minutes).padStart(2, '0');
   const formattedSeconds = String(remainingSeconds).padStart(2, '0');

   if (hours > 0) {
     return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
   }
   return `${formattedMinutes}:${formattedSeconds}`;
};

export function getFileType(file: DriveFile): string {
  const mimeType = file.mimeType || '';

  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';

  const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'json', 'py', 'css', 'html', 'md', 'sh', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'php', 'swift', 'kt', 'rs', 'txt'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension && codeExtensions.includes(fileExtension)) {
    return 'code';
  }

  return 'other';
}