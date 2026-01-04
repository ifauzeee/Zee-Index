"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, X, User } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslations } from "next-intl";

interface AuthModalProps {
  folderName: string;

  onSubmit: (id: string, password: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function AuthModal({
  folderName,
  onSubmit,
  onClose,
  isLoading,
}: AuthModalProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const t = useTranslations("AuthModal");

  useScrollLock(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(id, password);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayVariants}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-sm bg-background p-6 rounded-lg shadow-xl"
        variants={modalVariants}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-semibold mb-1">Akses Terbatas</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Folder <span className="font-bold text-primary">{folderName}</span>{" "}
          dilindungi.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={t("userIdPlaceholder")}
              className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-ring focus:outline-none"
              required
              autoFocus
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-ring focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:bg-primary/50"
          >
            {isLoading ? (
              <>
                <span className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></span>
                Memverifikasi...
              </>
            ) : (
              "Buka Folder"
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
