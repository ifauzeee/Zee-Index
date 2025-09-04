// File: components/Header.tsx

"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from "next-auth/react";
import { Sun, Moon, RefreshCw, Send, Coffee, HardDrive, Search as SearchIcon, Menu, X, LogIn, LogOut } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Search from '@/components/Search';
import { AnimatePresence, motion } from 'framer-motion';

function AuthButton() {
    const { data: session, status } = useSession();
    if (status === "loading") {
        return <div className="w-24 h-9 bg-muted rounded-lg animate-pulse" />;
    }
    if (session) {
        return (
            <button onClick={() => signOut({ callbackUrl: '/login' })} title="Logout" className="p-2 rounded-lg hover:bg-accent flex items-center gap-2">
                <LogOut size={20} />
                <span className="text-sm font-medium">Logout</span>
            </button>
        );
    }
    return (
        <button onClick={() => signIn('google')} title="Login with Google" className="p-2 rounded-lg hover:bg-accent flex items-center gap-2">
            <LogIn size={20} />
            <span className="hidden sm:inline text-sm font-medium">Login</span>
        </button>
    );
}

export default function Header() {
    const router = useRouter();
    const { theme, toggleTheme, triggerRefresh, shareToken, user } = useAppStore();
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { id: 'storage', href: '/storage', icon: HardDrive, label: 'Penyimpanan' },
        { id: 'theme', onClick: toggleTheme, icon: theme === 'light' ? Moon : Sun, label: `Ganti Tema` },
        { id: 'refresh', onClick: triggerRefresh, icon: RefreshCw, label: 'Segarkan Halaman' },
        { id: 'telegram', href: 'https://t.me/RyzeeenUniverse', target: '_blank', rel: 'noopener noreferrer', icon: Send, label: 'Join Grup' },
        { id: 'donate', href: 'https://ifauzeee.vercel.app/donate', target: '_blank', rel: 'noopener noreferrer', icon: Coffee, label: 'Donasi' },
    ];
    
    const handleLogoClick = () => {
        router.push('/');
    };

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
        if (isMobileMenuOpen) {
            document.body.classList.add('mobile-menu-open');
        } else {
            document.body.classList.remove('mobile-menu-open');
        }
    }, [isMobileMenuOpen]);

    return (
        <>
            <header className="sticky top-0 z-40 bg-background flex justify-between items-center py-4 border-b gap-4">
                <h1 
                    onClick={handleLogoClick} 
                    className={`text-2xl font-bold flex items-center shrink-0 cursor-pointer`} 
                    title={'Kembali ke Beranda'}
                >
                    <i className="fab fa-google-drive text-blue-500 mr-3"></i>Zee Index
                </h1>
            
                <div className="w-full max-w-md hidden sm:block">
                    <Suspense fallback={<div className="w-full h-10 bg-muted rounded-lg animate-pulse" />}>
                        <Search />
                    </Suspense>
                </div>
                
                <div className="hidden sm:flex items-center gap-2">
                    {shareToken ? (
                        menuItems
                        .filter(item => item.id === 'theme')
                        .map(item => {
                            const Icon = item.icon;
                            return (
                                <button key={item.id} onClick={item.onClick} title={item.label} className="p-2 rounded-lg hover:bg-accent">
                                    <Icon size={20} />
                                </button>
                            );
                        })
                    ) : (
                        <>
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return 'href' in item && item.href ? (
                                <a key={item.id} href={item.href} target={item.target} rel={item.rel} title={item.label} className="p-2 rounded-lg hover:bg-accent">
                                    <Icon size={20} />
                                </a>
                            ) : (
                                'onClick' in item && <button key={item.id} onClick={item.onClick} title={item.label} className="p-2 rounded-lg hover:bg-accent">
                                    <Icon size={20} />
                                </button>
                            );
                        })}
                        <AuthButton />
                        </>
                    )}
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
                        <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent text-foreground">
                            <X size={24} />
                        </button>
                        <div className="flex flex-col gap-4 text-lg">
                            {menuItems
                                .filter(item => {
                                    if (shareToken) {
                                        return item.id === 'theme';
                                    }
                                    if (user?.role !== 'ADMIN' && item.id === 'storage') {
                                        return false;
                                    }
                                    return true;
                                })
                                .map((item) => {
                                    const Icon = item.icon;
                                    const commonClasses = "flex items-center gap-4 hover:text-primary transition-colors";
                                    return 'href' in item && item.href ? (
                                        <a key={item.id} href={item.href} target={item.target} rel={item.rel} onClick={() => setIsMobileMenuOpen(false)} className={commonClasses}>
                                            <Icon size={24} />
                                            <span>{item.label}</span>
                                        </a>
                                    ) : (
                                        'onClick' in item && typeof item.onClick === 'function' && 
                                        <button key={item.id} onClick={() => { item.onClick(); setIsMobileMenuOpen(false); }} className={commonClasses}>
                                            <Icon size={24} />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            
                            {/* BARIS PERBAIKAN: Tombol AuthButton sekarang selalu ditampilkan */}
                            <div className="pt-4 border-t border-muted">
                                <AuthButton />
                            </div>
                        </div>
                    </motion.nav>
                )}
            </AnimatePresence>
        </>
    );
}