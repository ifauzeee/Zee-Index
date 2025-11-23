"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  UploadCloud,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface RequestInfo {
  title: string;
  folderName: string;
  folderId: string;
}

export default function PublicUploadPage() {
  const params = useParams();
  const token = params.token as string;
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "completed" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`/api/file-request/${token}`);
        if (!res.ok) {
          if (res.status === 404 || res.status === 410)
            throw new Error("Link ini tidak valid atau sudah kadaluarsa.");
          throw new Error("Gagal memuat informasi.");
        }
        const data = await res.json();
        setRequestInfo(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      const initRes = await fetch(
        `/api/file-request/upload?type=init&token=${token}`,
        {
          method: "POST",
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type,
            size: file.size,
          }),
        },
      );

      if (!initRes.ok) throw new Error("Init failed");
      const { uploadUrl } = await initRes.json();

      const CHUNK_SIZE = 5 * 1024 * 1024;
      let start = 0;

      while (start < file.size) {
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const chunkRes = await fetch(
          `/api/file-request/upload?type=chunk&token=${token}&uploadUrl=${encodeURIComponent(
            uploadUrl,
          )}`,
          {
            method: "POST",
            headers: {
              "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
              "Content-Type": "application/octet-stream",
            },
            body: chunk,
          },
        );

        if (!chunkRes.ok) {
          throw new Error(`Chunk upload failed: ${chunkRes.statusText}`);
        }

        const percent = Math.round((end / file.size) * 100);
        setUploadProgress((prev) => ({ ...prev, [file.name]: percent }));
        start = end;
      }

      setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
    } catch (err) {
      console.error("Upload error:", err);
      throw err;
    }
  };

  const handleStartUpload = async () => {
    if (files.length === 0) return;
    setUploadStatus("uploading");

    try {
      for (const file of files) {
        await uploadFile(file);
      }
      setUploadStatus("completed");
      setFiles([]);
    } catch (err) {
      console.error(err);
      setUploadStatus("error");
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 text-red-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Link Tidak Tersedia</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-card border rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-8 text-center border-b bg-muted/30">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UploadCloud size={32} />
          </div>
          <h1 className="text-2xl font-bold">{requestInfo?.title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Anda diundang untuk mengunggah file ke folder{" "}
            <strong>{requestInfo?.folderName}</strong>.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {uploadStatus === "completed" ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Upload Berhasil!</h3>
              <p className="text-muted-foreground mb-6">
                File Anda telah terkirim dengan aman.
              </p>

              {requestInfo && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-dashed border-primary/20">
                  <p className="text-sm font-medium mb-2">Lihat Folder:</p>
                  <a
                    href={`${window.location.origin}/folder/${requestInfo.folderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-primary hover:underline text-sm break-all"
                  >
                    <ExternalLink size={14} />
                    {`${window.location.origin}/folder/${requestInfo.folderId}`}
                  </a>
                </div>
              )}

              <button
                onClick={() => {
                  setUploadStatus("idle");
                  setUploadProgress({});
                }}
                className="text-primary hover:underline text-sm"
              >
                Kirim file lain
              </button>
            </div>
          ) : (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 rounded-xl p-8 text-center cursor-pointer transition-all"
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">Klik untuk pilih file</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dokumen, Foto, Video, dll.
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <File size={20} className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{formatBytes(file.size)}</span>
                          {uploadProgress[file.name] !== undefined && (
                            <span>{uploadProgress[file.name]}%</span>
                          )}
                        </div>
                        {uploadProgress[file.name] !== undefined && (
                          <div className="h-1 w-full bg-muted rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {files.length > 0 && (
                <button
                  onClick={handleStartUpload}
                  disabled={uploadStatus === "uploading"}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {uploadStatus === "uploading" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Mulai Upload"
                  )}
                </button>
              )}

              {uploadStatus === "error" && (
                <div className="p-3 bg-red-100 text-red-600 text-sm rounded-lg text-center">
                  Gagal mengupload sebagian file. Silakan coba lagi.
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 text-center text-xs text-muted-foreground border-t bg-muted/20">
          Powered by Zee-Index
        </div>
      </motion.div>
    </div>
  );
}
