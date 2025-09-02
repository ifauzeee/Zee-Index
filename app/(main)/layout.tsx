// app/(main)/layout.tsx
"use client";
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import { Sun, Moon, RefreshCw, Send, Coffee, HardDrive, Search as SearchIcon, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { formatBytes } from '@/lib/utils';
import BulkActionBar from '@/components/BulkActionBar';
import Search from '@/components/Search';
import Toast from '@/components/Toast';
import { AnimatePresence, motion } from 'framer-motion';
import { JWTPayload } from 'jose';

import './globals.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'plyr/dist/plyr.css';

const inter = Inter({ subsets: ['latin'] });

const jwtDecode = (token: string): JWTPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

function SearchParamsHandler() {
    const searchParams = useSearchParams();
    const { setShareToken, addToast } = useAppStore();
    const router = useRouter();

    useEffect(() => {
        const token = searchParams.get('share_token');
        if (token) {
            setShareToken(token);
            try {
                const payload = jwtDecode(token);
                if (payload && payload.type === 'timed' && payload.exp) {
                    const expiryTimeInSeconds = payload.exp as number;
                    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
                    const timeRemaining = expiryTimeInSeconds - currentTimeInSeconds;
                    if (timeRemaining > 0) {
                        const timeout = setTimeout(() => {
                            setShareToken(null);
                            addToast({ message: 'Tautan berbagi Anda telah kedaluwarsa.', type: 'info' });
                            router.push('/login');
                        }, timeRemaining * 1000);
                        return () => clearTimeout(timeout);
                    } else {
                        setShareToken(null);
                        addToast({ message: 'Tautan berbagi yang Anda gunakan sudah kedaluwarsa.', type: 'error' });
                        router.push('/login');
                    }
                }
            } catch (error) {
                console.error("Failed to decode JWT:", error);
            }
        }
    }, [searchParams, setShareToken, addToast, router]);

    return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { 
    theme, setTheme, toggleTheme, triggerRefresh, 
    refreshKey, shareToken, toasts, removeToast, addToast
  } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth >= 640) {
            setIsMobileMenuOpen(false);
            setIsSearchVisible(false);
        }
    };
    window.addEventListener('resize', handleResize);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null; 
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; 
    if (savedTheme) { 
        setTheme(savedTheme); 
    } else { 
        setTheme(prefersDark ? 'dark' : 'light'); 
    }
    return () => window.removeEventListener('resize', handleResize);
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
            try { 
                valueSpan.textContent = 'Menghitung...'; 
                const url = new URL('/api/datausage', window.location.origin); 
                if (shareToken) { 
                    url.searchParams.set('share_token', shareToken); 
                } 
                const response = await fetch(url.toString()); 
                if (!response.ok) throw new Error('Gagal mengambil data'); 
                const data = await response.json(); 
                valueSpan.textContent = formatBytes(data.totalUsage); 
            } catch (error) { 
                console.error('Gagal mengambil penggunaan data:', error); 
                valueSpan.textContent = 'Gagal memuat'; 
            } 
        } 
    }; 
    fetchDataUsage(); 
  }, [refreshKey, shareToken]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (isSearchVisible) setIsSearchVisible(false);
  };

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);
  
  const handleItemClick = () => {
      setIsMobileMenuOpen(false);
  };

  const menuItems = [
      { href: '/storage', icon: HardDrive, label: 'Penyimpanan' },
      { onClick: toggleTheme, icon: theme === 'light' ? Moon : Sun, label: `Ganti Tema` },
      { onClick: triggerRefresh, icon: RefreshCw, label: 'Segarkan Halaman' },
      { href: 'https://t.me/RyzeeenUniverse', target: '_blank', rel: 'noopener noreferrer', icon: Send, label: 'Join Grup' },
      { href: 'https://ifauzeee.vercel.app/donate', target: '_blank', rel: 'noopener noreferrer', icon: Coffee, label: 'Donasi' },
  ];

  return (
    <html lang="id" className={theme} style={{ colorScheme: theme }}>
      <body>
        <Suspense fallback={null}>
            <SearchParamsHandler />
        </Suspense>
        <div id="app-container" className={`${inter.className} bg-background text-foreground min-h-screen flex flex-col`}>
          <div className="container mx-auto px-4 max-w-7xl flex-grow">
            <header className="sticky top-0 z-40 bg-background flex justify-between items-center py-4 border-b gap-4">
              <h1 onClick={() => router.push('/')} className="text-2xl font-bold flex items-center cursor-pointer shrink-0" title="Kembali ke Beranda">
                <i className="fab fa-google-drive text-blue-500 mr-3"></i>Zee Index
              </h1>
              
              {/* Dekstop Navigation */}
              <div className="w-full max-w-md hidden sm:block">
                <Suspense fallback={<div className="w-full h-10 bg-muted rounded-lg animate-pulse" />}>
                  <Search />
                </Suspense>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    if (item.href) {
                        return (
                            <a key={index} href={item.href} target={item.target} rel={item.rel} title={item.label} className="p-2 rounded-lg hover:bg-accent flex items-center gap-2">
                                <Icon size={20} />
                                {item.label === 'Donasi' && <span className="hidden sm:inline text-sm font-medium">{item.label}</span>}
                            </a>
                        );
                    }
                    return (
                        <button key={index} onClick={() => { item.onClick && item.onClick(); }} title={item.label} className="p-2 rounded-lg hover:bg-accent flex items-center gap-2">
                            <Icon size={20} />
                            {item.label === 'Donasi' && <span className="hidden sm:inline text-sm font-medium">{item.label}</span>}
                        </button>
                    );
                })}
              </div>

              {/* Mobile Navigation */}
              <div className="flex items-center gap-2 sm:hidden">
                <button 
                  onClick={() => { setIsSearchVisible(!isSearchVisible); setIsMobileMenuOpen(false); }}
                  title="Cari"
                  aria-label="Cari file"
                  className="p-2 rounded-lg hover:bg-accent"
                >
                  {isSearchVisible ? <X size={20} /> : <SearchIcon size={20} />}
                </button>
                <button 
                  onClick={toggleMobileMenu} 
                  title="Menu"
                  aria-label="Toggle menu"
                  className="p-2 rounded-lg hover:bg-accent"
                >
                  {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </header>
            
            {isSearchVisible && (
              <div className="mt-4 sm:hidden">
                <Suspense fallback={<div className="w-full h-10 bg-muted rounded-lg animate-pulse" />}>
                  <Search onSearchClose={() => setIsSearchVisible(false)} />
                </Suspense>
              </div>
            )}
            
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.nav 
                  initial={{ opacity: 0, x: "-100%" }}
                  animate={{ opacity: 1, x: "0%" }}
                  exit={{ opacity: 0, x: "-100%" }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 z-50 h-screen bg-background flex flex-col items-center justify-center p-4 sm:hidden"
                >
                  <button onClick={toggleMobileMenu} className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent" aria-label="Tutup menu">
                      <X size={24} />
                  </button>
                  <ul className="flex flex-col gap-6 text-xl text-center w-full max-w-sm">
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        if (item.href) {
                            return (
                                <li key={index}>
                                    <a href={item.href} target={item.target} rel={item.rel} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors w-full justify-center text-2xl font-bold" onClick={handleItemClick}>
                                        <Icon size={32} />
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            );
                        }
                        return (
                            <li key={index}>
                                <button onClick={() => { item.onClick && item.onClick(); handleItemClick(); }} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors w-full justify-center text-2xl font-bold"> 
                                    <Icon size={32} />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                  </ul>
                </motion.nav>
              )}
            </AnimatePresence>

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
            <p id="data-usage-container" className="mb-2"> <i className="fas fa-server mr-2"></i>Total Penggunaan Data: <span id="data-usage-value">Memuat...</span> </p>
            <p>© All rights reserved - <a href="https://ifauzeee.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary">Muhammad Ibnu Fauzi</a> {currentYear}</p>
          </footer>
        </div>
        <BulkActionBar />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: ` if (typeof pdfjsLib !== 'undefined') { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'; } `}} />
      </body>
    </html>
  );
}