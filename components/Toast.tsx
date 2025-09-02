// components/Toast.tsx
"use client";

import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { Toast as ToastType } from '@/lib/store';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const icons = {
  success: <CheckCircle className="text-green-500" />,
  error: <XCircle className="text-red-500" />,
  info: <Info className="text-blue-500" />,
};

export default function Toast({ toast, onRemove }: ToastProps) {
  const Icon = icons[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="flex items-center w-full max-w-sm p-4 text-foreground bg-card border shadow-lg rounded-lg pointer-events-auto"
    >
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8">
        {Icon}
      </div>
      <div className="ms-3 text-sm font-normal">{toast.message}</div>
      <button
        onClick={() => onRemove(toast.id)}
        className="ms-auto -mx-1.5 -my-1.5 bg-card text-muted-foreground hover:text-foreground rounded-lg focus:ring-2 focus:ring-ring p-1.5 hover:bg-accent inline-flex items-center justify-center h-8 w-8"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}