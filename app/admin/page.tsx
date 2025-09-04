// app/(main)/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAppStore, ShareLink } from "@/lib/store";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertCircle, Copy } from "lucide-react";
import Loading from '@/components/Loading';
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react"; // Import useSession

export default function AdminPage() {
    const { user, shareLinks, removeShareLink, addToast, fetchUser } = useAppStore();
    const { status } = useSession(); // Ambil status sesi

    useEffect(() => {
        // Fetch user data from the server if authenticated but not yet in store
        if (status === 'authenticated' && !user) {
            fetchUser();
        }
    }, [status, user, fetchUser]);

    // Handle loading state
    if (status === 'loading') {
        return <Loading />;
    }

    // Check for admin role after authentication is complete
    if (user?.role !== 'ADMIN' || status === 'unauthenticated') {
        return (
            <div className="text-center py-20 text-red-500">
                <AlertCircle className="h-16 w-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Akses Ditolak</h1>
                <p className="mt-2 text-muted-foreground">Anda tidak memiliki izin untuk melihat halaman ini.</p>
            </div>
        );
    }
    
    const handleCopy = (shareUrl: string) => {
        navigator.clipboard.writeText(shareUrl);
        addToast({ message: 'Tautan disalin ke clipboard!', type: 'success' });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-3xl font-bold mb-6">Manajemen Tautan Berbagi</h1>
            <div className="bg-card border rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tautan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nama File</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Kedaluwarsa</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Login Diperlukan</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        <AnimatePresence initial={false}>
                            {shareLinks.map((link) => (
                                <motion.tr 
                                    key={link.id} 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="hover:bg-accent/50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-foreground truncate max-w-xs">
                                        <Link href={`${link.path}?share_token=${link.token}`} className="hover:underline">
                                            {link.path}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">{link.itemName}</td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {format(new Date(link.expiresAt), 'dd MMMM yyyy HH:mm', { locale: id })}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                            link.loginRequired ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        )}>
                                            {link.loginRequired ? 'YA' : 'TIDAK'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleCopy(`${window.location.origin}${link.path}?share_token=${link.token}`)}
                                                className="p-2 rounded-md hover:bg-muted"
                                                title="Salin Tautan"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button 
                                                onClick={() => removeShareLink(link.id)}
                                                className="p-2 rounded-md hover:bg-muted text-red-500"
                                                title="Hapus Dari Daftar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {shareLinks.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <AlertCircle className="h-16 w-16 mx-auto mb-4" />
                        <p>Tidak ada tautan berbagi yang dibuat dalam sesi ini.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}