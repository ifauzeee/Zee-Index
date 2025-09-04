// File: app/admin/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppStore, ShareLink } from "@/lib/store";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertCircle, Copy, Link as LinkIcon, Clock, ShieldCheck, Hourglass } from "lucide-react";
import Loading from '@/components/Loading';
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Komponen Modal Konfirmasi Hapus (Tetap sama)
const DeleteConfirmationModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onCancel}
    >
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="text-center">
                 <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">Hapus Tautan?</h3>
                 <p className="mt-2 text-sm text-muted-foreground">
                    Tindakan ini akan membatalkan tautan secara permanen dan tidak dapat diurungkan. Anda yakin?
                </p>
             </div>
            <div className="mt-6 flex justify-center gap-4">
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent">
                     Batal
                </button>
                <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Ya, Hapus
                </button>
             </div>
        </motion.div>
    </motion.div>
);


export default function AdminPage() {
    const { user, shareLinks, removeShareLink, addToast, fetchUser } = useAppStore();
    const { status } = useSession();
    const router = useRouter();
    const [linkToDelete, setLinkToDelete] = useState<ShareLink | null>(null);

    useEffect(() => {
        if (status === 'authenticated' && !user) {
            fetchUser();
        }
    }, [status, user, fetchUser]);

    const { activeLinks, expiredLinks } = useMemo(() => {
        const now = new Date();
        const active: ShareLink[] = [];
        const expired: ShareLink[] = [];
        shareLinks.forEach(link => {
            if (new Date(link.expiresAt) > now) {
                active.push(link);
             } else {
                expired.push(link);
            }
        });
       return { activeLinks: active, expiredLinks: expired };
    }, [shareLinks]);

    const handleCopy = (shareUrl: string) => {
        navigator.clipboard.writeText(shareUrl);
        addToast({ message: 'Tautan disalin ke clipboard!', type: 'success' });
    };
    
    const handleDeleteClick = (link: ShareLink) => {
        setLinkToDelete(link);
    };

    const confirmDelete = () => {
        if (linkToDelete) {
            removeShareLink(linkToDelete.id);
            setLinkToDelete(null);
        }
    };

    if (status === 'loading' || (status === 'authenticated' && !user)) {
        return <Loading />;
    }

    if (user?.role !== 'ADMIN' || status === 'unauthenticated') {
        return (
             <div className="text-center py-20 text-red-500">
                <AlertCircle className="h-16 w-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Akses Ditolak</h1>
                <p className="mt-2 text-muted-foreground">Anda tidak memiliki izin untuk melihat halaman ini.</p>
            </div>
        );
    }

    return (
        <>
            <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                 animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5 }}
            >
                {/* Judul Halaman */}
                <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

                {/* Kartu Statistik */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Card Total Links */}
                    <div className="relative overflow-hidden rounded-lg border bg-card p-6">
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-primary/5"></div>
                        <LinkIcon className="absolute right-4 top-4 text-primary/20" size={48} />
                        <div className="relative">
                            <p className="text-sm text-muted-foreground">Total Tautan</p>
                            <p className="text-4xl font-bold">{shareLinks.length}</p>
                        </div>
                    </div>
                    {/* Card Active Links */}
                    <div className="relative overflow-hidden rounded-lg border bg-card p-6">
                         <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-green-500/5"></div>
                        <Clock className="absolute right-4 top-4 text-green-500/20" size={48} />
                        <div className="relative">
                            <p className="text-sm text-muted-foreground">Tautan Aktif</p>
                            <p className="text-4xl font-bold">{activeLinks.length}</p>
                        </div>
                    </div>
                     {/* Card Expired Links */}
                     <div className="relative overflow-hidden rounded-lg border bg-card p-6">
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-red-500/5"></div>
                        <Hourglass className="absolute right-4 top-4 text-red-500/20" size={48} />
                        <div className="relative">
                            <p className="text-sm text-muted-foreground">Tautan Kedaluwarsa</p>
                            <p className="text-4xl font-bold">{expiredLinks.length}</p>
                        </div>
                    </div>
                </div>

                 {/* Daftar Tautan */}
                <h2 className="text-2xl font-semibold mb-6">Manajemen Tautan Berbagi</h2>
                 
                {shareLinks.length === 0 ? (
                     <div className="text-center py-20 text-muted-foreground bg-card border rounded-lg">
                        <AlertCircle className="h-16 w-16 mx-auto mb-4" />
                         <p>Tidak ada tautan berbagi yang pernah dibuat.</p>
                     </div>
                 ) : (
                    <div className="space-y-4">
                         <AnimatePresence>
                            {shareLinks.map((link) => {
                                 const isExpired = new Date(link.expiresAt) < new Date();
                                 return (
                                    <motion.div
                                         key={link.id}
                                         layout
                                         initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                         animate={{ opacity: 1, y: 0, scale: 1 }}
                                         exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                         className={cn(
                                             "bg-card border rounded-lg p-4 transition-all duration-300",
                                             isExpired && "opacity-60 hover:opacity-100"
                                         )}
                                     >
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                             <div className="flex-1 min-w-0">
                                                 <p className="text-sm text-muted-foreground truncate" title={link.itemName}>{link.itemName}</p>
                                                 <a 
                                                     href={`${window.location.origin}${link.path}?share_token=${link.token}`} 
                                                     target="_blank" 
                                                     rel="noopener noreferrer"
                                                     className="text-base font-semibold text-primary truncate block hover:underline"
                                                 >
                                                     {link.path}
                                                 </a>
                                             </div>
                                             <div className="flex items-center gap-4 mt-3 sm:mt-0">
                                                 <span className={cn(
                                                     "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                                     link.loginRequired 
                                                         ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' 
                                                         : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                                 )}>
                                                     <ShieldCheck size={14}/>
                                                     {link.loginRequired ? 'Login' : 'Publik'}
                                                 </span>
                                             </div>
                                         </div>
                                         <div className="border-t my-4"></div>
                                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                             <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 sm:mb-0">
                                                <span className={cn("h-2 w-2 rounded-full", isExpired ? "bg-red-500" : "bg-green-500")}></span>
                                                 <span>
                                                     {isExpired ? 'Kedaluwarsa' : 'Aktif'} • Kedaluwarsa pada: {format(new Date(link.expiresAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                                                 </span>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                 <button onClick={() => handleCopy(`${window.location.origin}${link.path}?share_token=${link.token}`)} className="p-2 rounded-md hover:bg-accent" title="Salin Tautan">
                                                     <Copy size={16} />
                                                 </button>
                                                 <button onClick={() => handleDeleteClick(link)} className="p-2 rounded-md hover:bg-accent text-red-500" title="Hapus & Batalkan Tautan">
                                                     <Trash2 size={16} />
                                                 </button>
                                             </div>
                                        </div>
                                     </motion.div>
                                 );
                            })}
                        </AnimatePresence>
                     </div>
                )}
            </motion.div>

             <AnimatePresence>
                {linkToDelete && (
                    <DeleteConfirmationModal 
                         onCancel={() => setLinkToDelete(null)}
                        onConfirm={confirmDelete}
                     />
                )}
            </AnimatePresence>
         </>
    );
}