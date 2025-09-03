// Lokasi: lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
// PERBAIKAN: Impor ikon 'Folder' dari lucide-react
import { File as FileIcon, Video, Image, Music, Archive, LucideIcon, Folder } from "lucide-react";

// Tipe data dasar untuk file, digunakan oleh getFileType
export interface DriveFile {
  mimeType: string;
  name: string;
}

/**
 * Menggabungkan beberapa nama kelas menjadi satu string,
 * menyelesaikan konflik kelas Tailwind CSS.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Memformat jumlah byte menjadi string yang mudah dibaca (KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * PERBAIKAN: Mengembalikan ikon Folder secara eksplisit untuk tipe folder.
 */
export function getIcon(mimeType: string): LucideIcon {
  if (typeof mimeType !== 'string') return FileIcon;
  if (mimeType === 'application/vnd.google-apps.folder') return Folder; // <-- BARIS BARU
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.startsWith("application/zip") || mimeType.startsWith("application/x-rar-compressed")) return Archive;
  return FileIcon;
}

/**
 * Mengubah durasi dalam detik menjadi format HH:MM:SS atau MM:SS.
 */
export const formatDuration = (seconds: number): string => {
   if (isNaN(seconds) || seconds < 0) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');

  if (hours > 0) {
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }
  return `${formattedMinutes}:${formattedSeconds}`;
};

/**
 * Menentukan kategori umum file berdasarkan tipe MIME atau ekstensi.
 */
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