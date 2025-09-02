// components/FileDetail.tsx
"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { DriveFile } from '@/lib/googleDrive';
import { useAppStore } from '@/lib/store';
import ShareButton from './ShareButton';

import 'plyr/dist/plyr.css';
import 'prismjs/themes/prism-tomorrow.min.css';
import Plyr from 'plyr';
import Prism from 'prismjs';
import { getFileType, formatBytes, formatDuration, getIcon } from '@/lib/utils';

declare const pdfjsLib: any;

export default function FileDetail({ file }: { file: DriveFile }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const router = useRouter();
  const { shareToken } = useAppStore();
  const handleBack = () => {
    router.back();
  };
  const directLink = useMemo(() => {
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }
    return url;
  }, [file.id, shareToken]);

  const fileType = getFileType(file);

  useEffect(() => {
    const renderPreview = async () => {
        if (!previewRef.current) return;
        
        if (playerRef.current) {
            playerRef.current.destroy();
            playerRef.current = null;
        }

        previewRef.current.innerHTML = '<div class="flex items-center justify-center h-full"><i class="fas fa-spinner fa-spin text-4xl"></i></div>';

        if (fileType === 'video' || fileType === 'audio') {
            const mediaTag = fileType === 'video' ? 'video' : 'audio';
            const posterUrl = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s1280') : '';
            
            const mediaElement = document.createElement(mediaTag);
            mediaElement.id = 'player';
            mediaElement.className = 'plyr'; // Tambahkan class plyr
            mediaElement.setAttribute('playsinline', '');
            mediaElement.setAttribute('controls', '');
            mediaElement.setAttribute('style', 'width: 100%; height: 100%;'); // Perbaikan utama: Atur style untuk mengisi ruang
            if (posterUrl) mediaElement.setAttribute('data-poster', posterUrl);
            const sourceElement = document.createElement('source');
            sourceElement.src = directLink;
            sourceElement.type = file.mimeType;

            mediaElement.appendChild(sourceElement);
            previewRef.current.innerHTML = '';
            previewRef.current.appendChild(mediaElement);
            playerRef.current = new Plyr(mediaElement);
        } else if (fileType === 'image') {
            const img = document.createElement('img');
            img.src = directLink;
            img.className = "max-h-full max-w-full object-contain mx-auto";
            previewRef.current.innerHTML = '';
            previewRef.current.appendChild(img);
        } else if (fileType === 'pdf') {
             if (typeof pdfjsLib === 'undefined') {
                previewRef.current.innerHTML = '<p class="text-center">Gagal memuat pustaka PDF. Harap segarkan halaman.</p>';
                return;
            }
            const container = document.createElement('div');
            container.id = 'pdf-viewer-container';
            container.className = 'w-full h-full overflow-auto p-4';
            
            const canvas = document.createElement('canvas');
            canvas.id = 'pdf-canvas';
            container.appendChild(canvas);
            previewRef.current.innerHTML = '';
            previewRef.current.appendChild(container);
            
            try {
                const loadingTask = pdfjsLib.getDocument(directLink);
                const pdfDoc = await loadingTask.promise;
                const page = await pdfDoc.getPage(1);
                const viewport = page.getViewport({ scale: 1.5 });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const renderContext = {
                    canvasContext: canvas.getContext('2d'),
                    viewport: viewport
                };
                await page.render(renderContext).promise;
            } catch (e) {
                previewRef.current.innerHTML = '<p class="text-center">Gagal memuat pratinjau PDF.</p>';
                console.error("PDF render error:", e);
            }
        } else if (fileType === 'code') {
            const pre = document.createElement('pre');
            pre.className = 'line-numbers h-full overflow-auto';
            const code = document.createElement('code');
            code.className = `language-${getLanguageFromFilename(file.name)}`;
            code.textContent = 'Memuat konten...';
            pre.appendChild(code);
            previewRef.current.innerHTML = '';
            previewRef.current.appendChild(pre);

            try {
                const response = await fetch(directLink);
                const textContent = await response.text();
                code.textContent = textContent;
                Prism.highlightElement(code);
            } catch (e) {
                code.textContent = "Gagal memuat konten file.";
            }
        } else {
            previewRef.current.innerHTML = `<div class="flex flex-col items-center justify-center h-full gap-4"><i class="fas ${getIcon(file)} text-9xl opacity-50"></i><p class="text-muted-foreground">Pratinjau tidak tersedia untuk tipe file ini.</p></div>`;
        }
    };

    if (typeof window !== 'undefined') {
        renderPreview();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [file.id, file.mimeType, file.name, file.thumbnailLink, fileType, directLink]);

  const metadata = file.imageMediaMetadata || file.videoMediaMetadata;

  return (
    <div className="view-container">
      <nav className="py-4">
        <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <i className="fas fa-arrow-left mr-2"></i>Kembali
        </button>
      </nav>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
        <div className="md:col-span-2 flex items-center justify-center min-h-[40vh] bg-card rounded-lg border overflow-hidden">
          <div id="detail-preview" ref={previewRef} className="w-full h-full flex items-center justify-center"></div>
        </div>
        <div className="md:col-span-1">
          <h2 className="text-2xl font-bold whitespace-normal break-words">{file.name}</h2>
          
          <div className="mt-6 border-t">
            <ul className="mt-4 space-y-3 text-sm text-foreground">
              <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Ukuran</span><span>{file.size ? formatBytes(Number(file.size)) : '-'}</span></li>
              <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Tipe</span><span className="break-all text-right">{file.mimeType || 'Tidak diketahui'}</span></li>
              {metadata?.width && metadata?.height && (
                <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Dimensi</span><span>{metadata.width} x {metadata.height} px</span></li>
              )}
              {file.videoMediaMetadata?.durationMillis && (
                 <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Durasi</span><span>{formatDuration(file.videoMediaMetadata.durationMillis)}</span></li>
               )}
              <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Dimodifikasi</span><span>{new Date(file.modifiedTime).toLocaleString('id-ID')}</span></li>
              <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Dibuat</span><span>{new Date(file.createdTime).toLocaleString('id-ID')}</span></li>
              {file.owners && file.owners.length > 0 && (
                 <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Pemilik</span><span>{file.owners[0].displayName}</span></li>
              )}
              {file.lastModifyingUser && (
                 <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Diubah oleh</span><span>{file.lastModifyingUser.displayName}</span></li>
              )}
              {file.md5Checksum && (
                 <li className="flex justify-between items-start gap-4"><span className="font-semibold text-muted-foreground shrink-0">MD5</span><span className="font-mono text-xs break-all text-right">{file.md5Checksum}</span></li>
              )}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t flex gap-4">
            <a href={directLink} download className="flex-1 flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold">
              <i className="fas fa-download mr-2"></i>Unduh File
            </a>
            {!shareToken && (
              <ShareButton 
                  path={`/folder/${file.parents?.[0]}/file/${file.id}/${encodeURIComponent(file.name)}`} 
                  itemName={file.name} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getLanguageFromFilename(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = { 
        js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
        json: 'json', py: 'python', css: 'css', html: 'html', 
        md: 'markdown', txt: 'text', sh: 'bash', java: 'java',
        c: 'c', cpp: 'cpp', cs: 'csharp', go: 'go', rb: 'ruby',
        php: 'php', swift: 'swift', kt: 'kotlin', rs: 'rust'
    };
    return langMap[ext] || 'clike';
}