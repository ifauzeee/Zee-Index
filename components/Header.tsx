// File: components/Header.tsx

"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut, signIn } from "next-auth/react";
import { Sun, Moon, RefreshCw, Send, Coffee, HardDrive, Search as SearchIcon, Menu, X, LogIn, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Search from '@/components/Search';
import { AnimatePresence, motion, useCycle } from 'framer-motion';

// Varian animasi (tetap sama)
const sidebarVariants = {
  open: (height = 1000) => ({
    clipPath: `circle(${height * 2 + 200}px at 40px 40px)`,
    transition: { type: "spring", stiffness: 20, restDelta: 2 }
  }),
  closed: {
    clipPath: "circle(24px at 40px 40px)",
    transition: { delay: 0.3, type: "spring", stiffness: 400, damping: 40 }
  }
};
const navVariants = {
    open: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
    closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
};
const menuItemVariants = {
    open: { y: 0, opacity: 1, transition: { y: { stiffness: 1000, velocity: -100 } } },
    closed: { y: 50, opacity: 0, transition: { y: { stiffness: 1000 } } }
};

export default function Header() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { theme, toggleTheme, triggerRefresh, shareToken, user } = useAppStore();
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isMobileMenuOpen, toggleMobileMenu] = useCycle(false, true);
    const containerRef = useRef(null);

    const menuItems = [
        ...(user?.role === 'ADMIN' ? [{ id: 'admin', href: '/admin', icon: ShieldCheck, label: 'Admin' }] : []),
        { id: 'storage', href: '/storage', icon: HardDrive, label: 'Penyimpanan' },
        { id: 'theme', onClick: toggleTheme, icon: theme === 'light' ? Moon : Sun, label: `Ganti Tema` },
        { id: 'refresh', onClick: triggerRefresh, icon: RefreshCw, label: 'Segarkan Halaman' },
        { id: 'telegram', href: 'https://t.me/RyzeeenUniverse', target: '_blank', rel: 'noopener noreferrer', icon: Send, label: 'Join Grup' },
        { id: 'donate', href: 'https://ifauzeee.vercel.app/donate', target: '_blank', rel: 'noopener noreferrer', icon: Coffee, label: 'Donasi' },
    ];

    const publicShareLinkItems = ['storage', 'theme', 'refresh', 'telegram', 'donate'];

    const handleLogoClick = () => {
        if (!shareToken) {
            router.push('/');
        }
    };

    const handleLoginClick = () => {
        signIn('google', { callbackUrl: window.location.href });
    };

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.classList.add('mobile-menu-open');
        } else {
            document.body.classList.remove('mobile-menu-open');
        }
    }, [isMobileMenuOpen]);

    const authButton = (
        status === "loading" ? (
            <div className="w-24 h-9 bg-muted rounded-lg animate-pulse" />
        ) : session ? (
            <button onClick={() => signOut({ callbackUrl: '/login' })} title="Logout" className="flex items-center gap-2 sm:gap-4 hover:text-primary transition-colors">
                <LogOut size={24} />
                <span className="sm:hidden">Logout</span>
            </button>
        ) : (
            <button onClick={handleLoginClick} title="Login" className="flex items-center gap-2 sm:gap-4 hover:text-primary transition-colors">
                <LogIn size={24} />
                 <span className="sm:hidden">Login</span>
            </button>
        )
    );

    // Helper untuk membuat tautan yang mempertahankan share_token
    const createLink = (baseHref: string) => {
        if (shareToken) {
            return `${baseHref}?share_token=${shareToken}`;
        }
        return baseHref;
    };

    return (
        <>
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md flex justify-between items-center py-4 border-b gap-4">
                <h1 
                    onClick={handleLogoClick} 
                    className={`text-2xl font-bold flex items-center shrink-0 ${!shareToken ? 'cursor-pointer' : 'cursor-default'}`} 
                    title={!shareToken ? 'Kembali ke Beranda' : 'Zee Index'}
                >
                    <i className="fab fa-google-drive text-blue-500 mr-3"></i>Zee Index
                </h1>
            
                <div className="flex-1 min-w-0 max-w-md hidden sm:block">
                     <Suspense fallback={<div className="w-full h-10 bg-muted rounded-lg animate-pulse" />}>
                       <Search />
                    </Suspense>
                 </div>
                 
                <div className="hidden sm:flex items-center gap-2">
                     {shareToken ? (
                         <>
                            {menuItems
                                .filter(item => publicShareLinkItems.includes(item.id))
                                .map(item => {
                                    const Icon = item.icon;
                                    return 'href' in item && item.href ? (
                                        <a key={item.id} href={item.target ? item.href : createLink(item.href)} target={item.target} rel={item.rel} title={item.label} className="p-2 rounded-lg hover:bg-accent">
                                            <Icon size={20} />
                                        </a>
                                    ) : (
                                        'onClick' in item && <button key={item.id} onClick={item.onClick} title={item.label} className="p-2 rounded-lg hover:bg-accent">
                                            <Icon size={20} />
                                        </button>
                                    );
                                })}
                            {authButton}
                         </>
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
                             {authButton}
                         </>
                     )}
                </div>

                {/* Mobile Menu Toggler */}
                <div className="flex items-center gap-2 sm:hidden">
                    <button onClick={() => setIsSearchVisible(!isSearchVisible)} title="Cari" className="p-2 rounded-lg hover:bg-accent z-50">
                        {isSearchVisible ? <ArrowLeft size={20} /> : <SearchIcon size={20} />}
                    </button>
                    <motion.button
                        onClick={() => toggleMobileMenu()}
                        animate={isMobileMenuOpen ? "open" : "closed"}
                        className="p-2 rounded-lg hover:bg-accent z-50"
                        title="Menu"
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </motion.button>
                </div>
            </header>
            
            {isSearchVisible && (
                 <div className="mt-4 sm:hidden">
                     <Suspense fallback={null}><Search onSearchClose={() => setIsSearchVisible(false)} /></Suspense>
                 </div>
             )}

            {/* Mobile Menu Content */}
            <div className="sm:hidden">
                <motion.nav
                    initial={false}
                    animate={isMobileMenuOpen ? "open" : "closed"}
                    custom="100%"
                    ref={containerRef}
                    className="fixed inset-0 z-40"
                >
                    <motion.div className="absolute inset-0 bg-background" variants={sidebarVariants} />
                    <motion.div className="flex flex-col items-center justify-center h-full" variants={navVariants}>
                        {menuItems
                            .filter(item => {
                                if (shareToken) {
                                    return publicShareLinkItems.includes(item.id);
                                }
                                if (user?.role !== 'ADMIN' && (item.id === 'admin' || item.id === 'storage')) {
                                    return false;
                                }
                                return true;
                            })
                            .map((item) => {
                                const Icon = item.icon;
                                const commonClasses = "flex items-center gap-4 hover:text-primary transition-colors text-2xl font-semibold py-2";
                                return (
                                    <motion.div key={item.id} variants={menuItemVariants} className="w-full text-center">
                                    {'href' in item && item.href ? (
                                        <a href={item.target ? item.href : createLink(item.href)} target={item.target} rel={item.rel} onClick={() => toggleMobileMenu()} className={commonClasses}>
                                            <Icon size={24} />
                                            <span>{item.label}</span>
                                        </a>
                                    ) : (
                                        'onClick' in item && typeof item.onClick === 'function' && 
                                        <button onClick={() => { item.onClick(); toggleMobileMenu(); }} className={commonClasses}>
                                            <Icon size={24} />
                                            <span>{item.label}</span>
                                        </button>
                                    )}
                                    </motion.div>
                                );
                            })}
                        
                        <motion.div variants={menuItemVariants} className="mt-8 pt-8 border-t border-muted w-48">
                           <div className="flex justify-center">{authButton}</div>
                        </motion.div>
                    </motion.div>
                </motion.nav>
            </div>
         </>
    );
}