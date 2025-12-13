"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Toast } from "@/lib/store";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

interface ToastProps {
  toast: Toast;

  onRemove: (id: string) => void;
}

const ToastComponent = ({ toast, onRemove }: ToastProps) => {
  const { id, message, type, duration } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, duration || 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [id, onRemove, duration]);

  const icons = {
    success: <CheckCircle2 className="text-green-500" />,
    error: <XCircle className="text-red-500" />,
    info: <Info className="text-blue-500" />,
  };

  const bgColors = {
    success: "bg-green-100 dark:bg-green-900 border-green-400",
    error: "bg-red-100 dark:bg-red-900 border-red-400",
    info: "bg-blue-100 dark:bg-blue-900 border-blue-400",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`relative flex items-center p-4 rounded-lg shadow-lg border-l-4 w-80 text-gray-800 dark:text-gray-200 ${bgColors[type]}`}
    >
      <div className="flex-shrink-0 mr-3">{icons[type]}</div>
      <div className="flex-1">{message}</div>
      <button
        onClick={() => onRemove(id)}
        className="ml-4 flex-shrink-0 text-gray-500 hover:text-gray-800 dark:hover:text-white"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
};

export default ToastComponent;
