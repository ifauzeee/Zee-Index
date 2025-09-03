// app/(main)/storage/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Loading from "@/components/Loading";
import { formatBytes, getIcon } from "@/lib/utils";
import { HardDrive, FileVideo, FileImage, FileAudio, FileText, FileQuestion, StickyNote, ArrowLeft } from "lucide-react";
import type { DriveFile } from "@/lib/googleDrive";

interface StorageDetails {
  usage: number;
  limit: number;
  breakdown: {
    type: string;
    count: number;
    size: number;
  }[];
  largestFiles: DriveFile[];
}

const typeIcons: Record<string, React.ReactNode> = {
    'Video': <FileVideo className="h-6 w-6 text-red-400" />,
    'Gambar': <FileImage className="h-6 w-6 text-green-400" />,
    'Audio': <FileAudio className="h-6 w-6 text-purple-400" />,
    'Dokumen': <FileText className="h-6 w-6 text-orange-400" />,
    'Google Docs': <StickyNote className="h-6 w-6 text-blue-400" />,
    'Lainnya': <FileQuestion className="h-6 w-6 text-gray-400" />,
};

export default function StoragePage() {
  const [data, setData] = useState<StorageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const createSlug = (name: string) => encodeURIComponent(name.replace(/\s+/g, '-').toLowerCase());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/storage-details');
        if (!response.ok) {
          throw new Error('Gagal memuat data penyimpanan. Silakan coba lagi nanti.');
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) return <Loading />;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!data) return null;

  const usagePercentage = (data.usage / data.limit) * 100;

  return (
    <motion.div 
        className="container mx-auto py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold flex items-center gap-3">
            <HardDrive size={32} />
            Detail Penyimpanan
        </h1>
      </div>

      {/* Ringkasan Penyimpanan */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-2 text-muted-foreground">
            <span className="font-medium">Total Pemakaian</span>
            <span>{usagePercentage.toFixed(2)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
          <motion.div 
                className="bg-primary h-4 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${usagePercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="text-right mt-2 font-mono text-sm">
            {formatBytes(data.usage)} dari {formatBytes(data.limit)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Kolom Kiri: Rincian per Tipe File */}
         <div>
          <h2 className="text-xl font-semibold mb-6 border-b pb-3">Rincian per Tipe File</h2>
          <ul className="space-y-5">
              {data.breakdown.map((item) => {
                  const itemPercentage = (item.size / data.usage) * 100;
                  return (
                      <li key={item.type}>
                          <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-3">
                                  {typeIcons[item.type] || typeIcons['Lainnya']}
                                  <p className="font-medium">{item.type}</p>
                              </div>
                              <div className="text-right">
                                  <p className="font-mono text-sm font-semibold">{formatBytes(item.size)}</p>
                              </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                              <div className="bg-primary/50 h-2 rounded-full" style={{ width: `${itemPercentage}%` }} />
                          </div>
                      </li>
                  );
              })}
          </ul>
        </div>
        {/* Kolom Kanan: File Terbesar */}
        <div>
          <h2 className="text-xl font-semibold mb-6 border-b pb-3">10 File Terbesar</h2>
          <ul className="space-y-3">
            {data.largestFiles.map(file => (
              <li key={file.id}>
                <Link href={`/folder/${file.parents?.[0]}/file/${file.id}/${createSlug(file.name)}`} legacyBehavior>
                  <a className="flex items-center gap-4 p-2 rounded-lg hover:bg-accent transition-colors">
                    {/* --- PERBAIKAN DI SINI --- */}
                    <i className={`fas ${getIcon(file.mimeType)} text-xl w-6 text-center`}></i>
                    <div className="flex-1 truncate">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                        {formatBytes(Number(file.size))}
                    </span>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}