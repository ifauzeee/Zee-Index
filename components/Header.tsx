// components/Header.tsx
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from "next-auth/react";
import { Sun, Moon, RefreshCw, Send, Coffee, HardDrive, Search as SearchIcon, Menu, X, LogIn, LogOut } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Search from '@/components/Search';
import { AnimatePresence, motion } from 'framer-motion';

function AuthButton() {
    // ... (kode AuthButton tetap sama)
    const { data: session, status } = useSession();
    if (status === "loading") {
        return <div className="w-24 h-9 bg-muted rounded-lg animate-pulse" />;
    }
    if (session) {
        return (
            <button onClick={() => signOut()} title="Logout" className="p-2 rounded-lg hover:bg-accent flex items-center gap-2">
                <LogOut size={20} />
                <span className="hidden sm:inline text-sm font-medium">Logout</span>
            </button>
        );
    }
    return (
        <button onClick={() => signIn('google')} title="Login dengan Google" className="p-2 rounded-lg hover:bg-accent flex items-center gap-2">
            <LogIn size={20} />
            <span className="hidden sm:inline text-sm font-medium">Login</span>
        </button>
    );
}


export default function Header() {
    const router = useRouter();
    const { theme, toggleTheme, triggerRefresh } = useAppStore();
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { href: '/storage', icon: HardDrive, label: 'Penyimpanan' },
        { onClick: toggleTheme, icon: theme === 'light' ? Moon : Sun, label: `Ganti Tema` },
        { onClick: triggerRefresh, icon: RefreshCw, label: 'Segarkan Halaman' },
        { href: 'https://t.me/RyzeeenUniverse', target: '_blank', rel: 'noopener noreferrer', icon: Send, label: 'Join Grup' },
        { href: 'https://ifauzeee.vercel.app/donate', target: '_blank', rel: 'noopener noreferrer', icon: Coffee, label: 'Donasi' },
    ];

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 640) {
                setIsMobileMenuOpen(false);
                setIsSearchVisible(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
    }, [isMobileMenuOpen]);
    
    return (
        <>
            {/* --- PERBAIKAN: Hapus bg-background/80 dan backdrop-blur-lg --- */}
            <header className="sticky top-0 z-40 bg-background flex justify-between items-center py-4 border-b gap-4">
                <h1 onClick={() => router.push('/')} className="text-2xl font-bold flex items-center cursor-pointer shrink-0" title="Kembali ke Beranda">
                    <i className="fab fa-google-drive text-blue-500 mr-3"></i>Zee Index
                </h1>
                <div className="w-full max-w-md hidden sm:block">
                    <Suspense fallback={<div className="w-full h-10 bg-muted rounded-lg animate-pulse" />}>
                        <Search />
                    </Suspense>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        return item.href ? (
                            <a key={index} href={item.href} target={item.target} rel={item.rel} title={item.label} className="p-2 rounded-lg hover:bg-accent">
                                <Icon size={20} />
                            </a>
                        ) : (
                            <button key={index} onClick={item.onClick} title={item.label} className="p-2 rounded-lg hover:bg-accent">
                                <Icon size={20} />
                            </button>
                        );
                    })}
                    <AuthButton />
                </div>
                <div className="flex items-center gap-2 sm:hidden">
                    <button onClick={() => setIsSearchVisible(!isSearchVisible)} title="Cari" className="p-2 rounded-lg hover:bg-accent">
                        {isSearchVisible ? <X size={20} /> : <SearchIcon size={20} />}
                    </button>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} title="Menu" className="p-2 rounded-lg hover:bg-accent">
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </header>
            
            {/* Sisa kode tetap sama */}
            {isSearchVisible && (
                <div className="mt-4 sm:hidden">
                    <Suspense fallback={null}><Search onSearchClose={() => setIsSearchVisible(false)} /></Suspense>
                </div>
            )}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.nav
                        initial={{ opacity: 0, x: "-100%" }}
                        animate={{ opacity: 1, x: "0%" }}
                        exit={{ opacity: 0, x: "-100%" }}
                        className="fixed inset-0 z-50 h-screen bg-background flex flex-col items-center justify-center p-4 sm:hidden"
                    >
                        {/* ... isi menu mobile ... */}
                    </motion.nav>
                )}
            </AnimatePresence>
        </>
    );
}