"use client";

import { useEffect } from 'react';
// PERBAIKAN: Ubah nama 'dynamic' yang diimpor menjadi 'dynamicImport' untuk menghindari konflik
import dynamicImport from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import BulkActionBar from '@/components/BulkActionBar';
import Toast from '@/components/Toast';
import { AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'plyr/dist/plyr.css';
import { Providers } from '../providers';
import { useSession } from 'next-auth/react';

// PERBAIKAN: Gunakan nama baru 'dynamicImport' untuk memuat komponen
const Header = dynamicImport(() => import('@/components/Header'), { ssr: false });

// Konfigurasi ini harus tetap bernama 'dynamic' dan diekspor
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { 
    theme, setTheme, refreshKey, toasts, removeToast, fetchUser
  } = useAppStore();
  const { status } = useSession();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUser();
    }
  }, [status, fetchUser]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
        setTheme(savedTheme);
    }
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchDataUsage = async () => {
        const valueSpan = document.getElementById('data-usage-value');
        if (valueSpan) {
            if (status === 'authenticated') {
                try {
                    valueSpan.textContent = 'Menghitung...';
                    const response = await fetch('/api/datausage');
                    if (!response.ok) throw new Error('Gagal mengambil data');
                    const data = await response.json();
                    valueSpan.textContent = formatBytes(data.totalUsage);
                } catch (error) {
                    console.error('Gagal mengambil penggunaan data:', error);
                    valueSpan.textContent = 'Gagal memuat';
                }
            } else if (status === 'unauthenticated') {
                valueSpan.textContent = '-';
            }
        }
    };
    fetchDataUsage();
  }, [refreshKey, status]);

  return (
    <html lang="id" className={theme} style={{ colorScheme: theme }}>
      <body>
        <Providers>
          <div id="app-container" className={`bg-background text-foreground min-h-screen flex flex-col`}>
            <div className="container mx-auto px-4 max-w-7xl flex-grow">
              <Header />
              <main className="min-h-[50vh] mb-12">
                {children}
              </main>
            </div>
            
            <div id="toast-container" className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
              <AnimatePresence>
                {toasts.map((toast) => (
                  <Toast key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
              </AnimatePresence>
            </div>

            <footer className="text-center py-6 text-sm text-muted-foreground border-t bg-background">
              <p id="data-usage-container" className="mb-2">
                <i className="fas fa-server mr-2"></i>Total Penggunaan Data: <span id="data-usage-value">Memuat...</span>
              </p>
              <p>&copy; {currentYear} All rights reserved - <a href="https://ifauzeee.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary">Muhammad Ibnu Fauzi</a></p>
            </footer>
          </div>
          <BulkActionBar />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}

function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}