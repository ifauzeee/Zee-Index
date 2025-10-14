

"use client";

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import BulkActionBar from '@/components/BulkActionBar';
import Toast from '@/components/Toast';
import { AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/next';
import { useSession } from 'next-auth/react';

const Header = dynamic(() => import('@/components/Header'), { ssr: false });

const AppFooter = () => {
  const { dataUsage } = useAppStore();
  const currentYear = new Date().getFullYear();
  return (
    <footer className="text-center py-6 text-sm text-muted-foreground border-t bg-background">
      <p className="mb-2">
        <i className="fas fa-server mr-2"></i>Total Penggunaan Data: <span id="data-usage-value">{dataUsage.value}</span>
      </p>
      <p>&copy; {currentYear} All rights reserved - <a href="https://ifauzeee.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary">Muhammad Ibnu Fauzi</a></p>
    </footer>
  );
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { 
    theme, setTheme, refreshKey, toasts, removeToast, fetchUser, fetchDataUsage
  } = useAppStore();
  const { status } = useSession();

  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUser();
      fetchDataUsage(); 
    }
  }, [status, fetchUser, fetchDataUsage, refreshKey]); 

  // Efek untuk menginisialisasi tema dari localStorage saat komponen dimuat
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
        setTheme(savedTheme);
    }
  }, [setTheme]);

  // Efek untuk menerapkan perubahan tema ke DOM dan localStorage
  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <>
      <div id="app-container" className={`bg-background text-foreground min-h-screen flex flex-col`}>
        <Header />
        <div className="container mx-auto px-4 max-w-7xl flex-grow">
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

        <AppFooter />
      </div>
      <BulkActionBar />
      <Analytics />
    </>
  );
}