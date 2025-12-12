"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface GlobalDropZoneProps {
    onDrop: (files: FileList) => void;
}

export default function GlobalDropZone({ onDrop }: GlobalDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const { user } = useAppStore();

    const handleDragEnter = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer?.types.includes("Files")) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.relatedTarget === null || !(e.relatedTarget as Node).parentNode) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                onDrop(e.dataTransfer.files);
            }
        },
        [onDrop]
    );

    useEffect(() => {
        if (user?.role !== "ADMIN") return;

        window.addEventListener("dragenter", handleDragEnter);
        window.addEventListener("dragleave", handleDragLeave);
        window.addEventListener("dragover", handleDragOver);
        window.addEventListener("drop", handleDrop);

        return () => {
            window.removeEventListener("dragenter", handleDragEnter);
            window.removeEventListener("dragleave", handleDragLeave);
            window.removeEventListener("dragover", handleDragOver);
            window.removeEventListener("drop", handleDrop);
        };
    }, [user?.role, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

    if (user?.role !== "ADMIN") return null;

    return (
        <AnimatePresence>
            {isDragging && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="flex flex-col items-center gap-4 p-12 rounded-2xl border-2 border-dashed border-primary bg-primary/5"
                    >
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <UploadCloud className="w-16 h-16 text-primary" />
                        </motion.div>
                        <div className="text-center">
                            <p className="text-xl font-semibold text-foreground">
                                Drop files to upload
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Release to start uploading
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
