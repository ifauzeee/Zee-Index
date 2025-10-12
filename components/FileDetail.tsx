
"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import type { DriveFile } from '@/lib/googleDrive';
import { useAppStore } from '@/lib/store';
import ShareButton from './ShareButton';
import 'plyr/dist/plyr.css';
import 'prismjs/themes/prism-tomorrow.min.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import Plyr from 'plyr';
import Prism from 'prismjs';
import 'prismjs/plugins/line-numbers/prism-line-numbers.min.js';
import { getFileType, formatBytes, formatDuration, getIcon } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

declare const pdfjsLib: any;
declare const ePub: any; 

export default function FileDetail({ file }: { file: DriveFile }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast, user, triggerRefresh } = useAppStore();
  const [showBackButton, setShowBackButton] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);

  const [editableContent, setEditableContent] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const shareToken = useMemo(() => searchParams.get('share_token'), [searchParams]);

  useEffect(() => {
    if (shareToken) {
      try {
        const decodedToken: { path: string, exp: number } = jwtDecode(shareToken);
        const currentPath = window.location.pathname;

        if (decodedToken.path === currentPath) {
          setShowBackButton(false);
        }

        const expirationTime = decodedToken.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;

        if (timeUntilExpiration > 0) {
           const timer = setTimeout(() => {
            addToast({ message: 'Sesi berbagi Anda telah berakhir.', type: 'info' });
            router.push('/login?error=InvalidOrExpiredShareLink');
           }, timeUntilExpiration);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error("Token tidak valid:", error);
       }
    }
  }, [shareToken, router, addToast]);

  const handleBack = () => router.back();
  const directLink = useMemo(() => {
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }
    return url;
  }, [file.id, shareToken]);
  
  const fileType = getFileType(file);

  useEffect(() => {
    setMarkdownContent(null);
    const renderPreview = async () => {
       if (!previewRef.current) return;
       if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      previewRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-primary"><i class="fas fa-spinner fa-spin text-4xl"></i></div>';
      
      try {
        if (fileType === 'video' || fileType === 'audio') {
          const mediaTag = fileType === 'video' ? 'video' : 'audio';
           const posterUrl = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s1280') : '';
           const mediaElement = document.createElement(mediaTag);
           mediaElement.id = 'player';
           mediaElement.setAttribute('playsinline', '');
          mediaElement.setAttribute('controls', '');
          mediaElement.style.width = '100%'; 
          mediaElement.style.height = '100%';
           if (posterUrl) mediaElement.setAttribute('data-poster', posterUrl);
          
          const mimeType = file.mimeType === 'application/octet-stream' && file.name.endsWith('.mkv') ? 'video/x-matroska' : file.mimeType;

          const sourceElement = document.createElement('source');
          sourceElement.src = directLink;
          sourceElement.type = mimeType;
          mediaElement.appendChild(sourceElement);
          
          previewRef.current.innerHTML = '';
          previewRef.current.appendChild(mediaElement);
          playerRef.current = new Plyr(mediaElement);
        } else if (fileType === 'image') {
           const img = document.createElement('img');
          img.src = directLink;
          img.className = "w-full h-full object-contain mx-auto";
          previewRef.current.innerHTML = '';
          previewRef.current.appendChild(img);
        } else if (fileType === 'pdf') {
          if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = `https://mozilla.github.io/pdf.js/build/pdf.worker.mjs`;
          }
          const container = document.createElement('div');
          container.id = 'pdf-viewer-container';
          container.className = 'w-full h-full overflow-auto p-4'; 
          previewRef.current.innerHTML = '';
          previewRef.current.appendChild(container);
          const loadingTask = pdfjsLib.getDocument(directLink);
          const pdfDoc = await loadingTask.promise;
          for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.className = 'mb-4 mx-auto shadow-lg';
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            container.appendChild(canvas);
            const renderContext = { canvasContext: context!, viewport: viewport };
            await page.render(renderContext).promise;
          }
        } else if (fileType === 'office') {
          const iframe = document.createElement('iframe');
          iframe.src = `https://docs.google.com/gview?url=${encodeURIComponent(directLink)}&embedded=true`;
          iframe.className = "w-full h-full border-0";
          previewRef.current.innerHTML = '';
          previewRef.current.appendChild(iframe);
        } else if (fileType === 'ebook') {
          if (typeof ePub !== 'undefined') {
            const bookContainer = document.createElement('div');
            bookContainer.id = 'epub-reader';
            bookContainer.className = 'w-full h-full';
            previewRef.current.innerHTML = '';
            previewRef.current.appendChild(bookContainer);
            
            const book = ePub(directLink);
            const rendition = book.renderTo(bookContainer.id, {
                width: "100%",
                height: "100%",
            });
            rendition.display();
          } else {
            throw new Error('Pustaka ePub.js tidak termuat.');
          }
        } else if (fileType === 'markdown' || fileType === 'code') {
            const response = await fetch(directLink);
            if (!response.ok) throw new Error('Gagal mengambil konten file');
            const textContent = await response.text();
            
            setEditableContent(textContent);

            if (fileType === 'markdown') {
                setMarkdownContent(textContent);
            } else { 
                const pre = document.createElement('pre');
                pre.className = 'line-numbers h-full w-full overflow-auto text-sm';
                const code = document.createElement('code');
                code.className = `language-${getLanguageFromFilename(file.name)}`;
                pre.appendChild(code);
                previewRef.current.innerHTML = '';
                previewRef.current.appendChild(pre);
                code.textContent = textContent;
                Prism.highlightAllUnder(previewRef.current!);
            }
        } else {
          const IconComponent = getIcon(file.mimeType);
          const iconString = renderToString(<IconComponent size={256} className="text-primary/20" />);
          previewRef.current.innerHTML = `
               <div class="flex flex-col items-center justify-center h-full gap-4">
                 <div>
                   ${iconString}
                 </div>
               </div>
              `;
        }
       } catch (error) {
         console.error("Preview Error:", error);
        previewRef.current.innerHTML = `<div class="flex flex-col items-center justify-center h-full gap-4 text-red-500"><i class="fas fa-exclamation-triangle text-6xl"></i><p>Gagal memuat pratinjau.</p></div>`;
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
  }, [file, fileType, directLink, addToast]);

  const handleSaveChanges = async () => {
    if (editableContent === null) return;
    setIsSaving(true);
    try {
        const response = await fetch('/api/files/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: file.id, newContent: editableContent }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Gagal menyimpan file.');
        
        addToast({ message: "Perubahan berhasil disimpan!", type: 'success' });
        setIsEditing(false);
        triggerRefresh();
        if (fileType === 'markdown') {
            setMarkdownContent(editableContent);
        }
    } catch (error: any) {
        addToast({ message: error.message, type: 'error' });
    } finally {
        setIsSaving(false);
    }
  };

  const metadata = file.imageMediaMetadata || file.videoMediaMetadata;
  const durationMillis = file.videoMediaMetadata?.durationMillis ? parseInt(file.videoMediaMetadata.durationMillis, 10) : undefined;
  const showShareButton = !searchParams.get('share_token') && user?.role === 'ADMIN';
  const isEditable = user?.role === 'ADMIN' && (fileType === 'code' || fileType === 'markdown');

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col h-screen overflow-hidden">
      
      <header className="flex items-center justify-between gap-4 mb-4">
        {showBackButton && (
          <button onClick={handleBack} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0">
             <ArrowLeft size={20} /> Kembali
          </button>
        )}
        {!showBackButton && <div />} 
        
        {showShareButton && <ShareButton path={`/folder/${file.parents?.[0]}/file/${file.id}/${encodeURIComponent(file.name)}`} itemName={file.name} />}
      </header>
          
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12 flex-1 overflow-hidden">

        <div className="lg:col-span-2 flex flex-col flex-1 min-h-0">
            {isEditable && (
                <div className="mb-2 flex justify-end gap-2">
                    {isEditing && (
                        <button onClick={handleSaveChanges} disabled={isSaving} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50">
                            <Save size={16} />
                            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    )}
                    <button onClick={() => setIsEditing(!isEditing)} className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
                         {isEditing ? 'Batal' : 'Edit File'}
                    </button>
                </div>
            )}
          
           <div className="w-full flex-1 flex items-start justify-center overflow-hidden"> 
            {isEditing && isEditable ? (
                <textarea
                    value={editableContent || ''}
                    onChange={(e) => setEditableContent(e.target.value)}
                    className="w-full h-full p-4 bg-background font-mono text-sm resize-none focus:outline-none"
                />
            ) : (
                fileType === 'markdown' && markdownContent ? (
                    <div className="prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg w-full h-full overflow-y-auto p-8">
                         <ReactMarkdown rehypePlugins={[rehypeRaw]}>{markdownContent}</ReactMarkdown>
                    </div>
                ) : (
                    <div ref={previewRef} className="w-full h-full flex items-center justify-center"></div>
                )
            )}
          </div>
        </div>

        <div className="lg:col-span-1 mt-8 lg:mt-0">
            <h1 className="text-2xl lg:text-3xl font-bold break-words mb-6">{file.name}</h1>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Informasi File</h3>
            <ul className="space-y-3 text-sm text-foreground">
                 <ListItem label="Ukuran" value={file.size ? formatBytes(Number(file.size)) : '-'} />
                <ListItem label="Tipe" value={file.mimeType} />
                {metadata?.width && metadata?.height && (
                    <ListItem label="Dimensi" value={`${metadata.width} x ${metadata.height} px`} />
                )}
                {durationMillis && (
                    <ListItem label="Durasi" value={formatDuration(durationMillis / 1000)} />
                )}
                 <ListItem label="Diubah" value={new Date(file.modifiedTime).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} />
                <ListItem label="Dibuat" value={new Date(file.createdTime).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} />
                {file.owners && file.owners.length > 0 && (
                    <ListItem label="Pemilik" value={file.owners[0].displayName} />
                )}
                {file.lastModifyingUser && (
                    <ListItem label="Diubah oleh" value={file.lastModifyingUser.displayName} />
                )}
                 {file.md5Checksum && (
                    <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-border">
                    <span className="font-medium text-muted-foreground shrink-0">MD5</span>
                    <span className="font-mono text-xs break-all text-left sm:text-right">{file.md5Checksum}</span>
                    </li>
                )}
            </ul>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <a href={directLink} download className="flex-1 flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-lg">
                    <i className="fas fa-download mr-3"></i>Unduh File
                </a>
            </div>
        </div>

      </div>
     </div>
  );
}

const ListItem = ({ label, value }: { label: string, value: string }) => (
  <li className="flex justify-between items-start gap-4">
    <span className="font-medium text-muted-foreground">{label}</span>
    <span className="text-right break-all">{value}</span>
  </li>
);

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