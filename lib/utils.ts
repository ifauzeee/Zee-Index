// lib/utils.ts
import type { DriveFile } from '@/lib/googleDrive';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
}

export function formatDuration(millis: string): string {
    const totalSeconds = Math.floor(parseInt(millis, 10) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const padded = (num: number) => num.toString().padStart(2, '0');

    let result = `${padded(minutes)}:${padded(seconds)}`;
    if (hours > 0) {
        result = `${padded(hours)}:${result}`;
    }
    return result;
}

export function getFileType(file: DriveFile): 'folder' | 'video' | 'image' | 'audio' | 'pdf' | 'code' | 'other' {
  if (file.isFolder) return 'folder';
  const mime = file.mimeType;
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  const codeMimes = ['text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json', 'text/markdown'];
  if (codeMimes.includes(mime) || file.name.match(/\.(js|ts|json|py|css|html|md|txt)$/)) return 'code';
  return 'other';
}

export function getIcon(file: DriveFile): string {
  if (file.isFolder) return 'fa-folder text-[color:var(--icon-folder-color)]';
  const mime = file.mimeType;
  if (mime.startsWith('image/')) return 'fa-file-image text-[color:var(--icon-image-color)]';
  if (mime.startsWith('video/')) return 'fa-file-video text-[color:var(--icon-video-color)]';
  if (mime.startsWith('audio/')) return 'fa-file-audio text-[color:var(--icon-audio-color)]';
  if (mime === 'application/pdf') return 'fa-file-pdf text-[color:var(--icon-pdf-color)]';
  if (getFileType(file) === 'code') return 'fa-file-code text-[color:var(--icon-code-color)]';
  return 'fa-file-lines text-[color:var(--icon-default-color)]';
}