"use client";

import { useState, useEffect } from "react";
import { Share2, X, Clock, Zap, Copy, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DriveFile } from "@/lib/googleDrive";

interface ShareButtonProps {
  path?: string;
  itemName?: string;
  items?: DriveFile[];
  isOpen?: boolean;
  onClose?: () => void;
}

type TimeUnit = "s" | "m" | "h" | "d";

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

export default function ShareButton({
  path,
  itemName,
  items,
  isOpen: controlledIsOpen,
  onClose,
}: ShareButtonProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { addToast, user, addShareLink } = useAppStore();

  const [customDuration, setCustomDuration] = useState<string | number>(10);
  const [customUnit, setCustomUnit] = useState<TimeUnit>("m");
  const [loginRequired, setLoginRequired] = useState(false);

  const isOpen = controlledIsOpen ?? internalIsOpen;

  useEffect(() => {
    if (controlledIsOpen && user && user.role !== "ADMIN") {
      addToast({ message: "Fitur berbagi hanya untuk Admin.", type: "error" });
      if (onClose) onClose();
    }
  }, [controlledIsOpen, user, addToast, onClose]);

  const handleOpen = () => {
    if (user?.role !== "ADMIN") {
      addToast({ message: "Fitur berbagi hanya untuk Admin.", type: "error" });
      return;
    }
    setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const generateLink = async (type: "timed" | "session") => {
    try {
      const durationValue =
        typeof customDuration === "string"
          ? parseInt(customDuration, 10) || 1
          : customDuration;
      const finalDuration = Math.max(1, durationValue);

      const expiresIn =
        type === "timed" ? `${finalDuration}${customUnit}` : "365d";

      const isCollection = items && items.length > 0;
      const sharePath = isCollection ? null : path;
      const shareName = isCollection
        ? `Koleksi ${items.length} item`
        : itemName;
      const shareItems = isCollection ? items : undefined;

      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({
          path: sharePath,
          itemName: shareName,
          type,
          expiresIn,
          loginRequired,
          items: shareItems,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal membuat tautan.");
      }

      const { shareableUrl, newShareLink } = await response.json();
      addShareLink(newShareLink);

      await navigator.clipboard.writeText(shareableUrl);
      addToast({ message: "Tautan berbagi telah disalin!", type: "success" });
      handleClose();
    } catch (error) {
      addToast({ message: (error as Error).message, type: "error" });
    }
  };

  if (controlledIsOpen && user && user.role !== "ADMIN") {
    return null;
  }

  const isCollection = items && items.length > 0;
  const title = isCollection
    ? `Bagikan ${items.length} item`
    : `Bagikan: ${itemName}`;

  const ModalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          onClick={handleClose}
        >
          <motion.div
            className="relative w-full max-w-md bg-background p-6 rounded-lg shadow-xl"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold mb-1 whitespace-normal break-words">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Pilih jenis tautan berbagi.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="text-primary" />
                  <h4 className="font-semibold">Tautan Berwaktu</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Tautan akan kedaluwarsa setelah durasi yang Anda tentukan.
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setCustomDuration(isNaN(val) ? "" : val);
                    }}
                    className="w-1/3 px-3 py-2 rounded-md border bg-background focus:ring-2 focus:ring-ring focus:outline-none text-sm"
                    min="1"
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as TimeUnit)}
                    className="w-2/3 px-3 py-2 rounded-md border bg-background focus:ring-2 focus:ring-ring focus:outline-none text-sm"
                  >
                    <option value="s">Detik</option>
                    <option value="m">Menit</option>
                    <option value="h">Jam</option>
                    <option value="d">Hari</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="text-amber-500" />
                  <h4 className="font-semibold">Tautan Sesi</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Tautan berlaku sangat lama (1 tahun), ideal untuk penggunaan
                  pribadi.
                </p>
              </div>

              <label
                htmlFor="loginRequired"
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                  loginRequired
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-accent",
                )}
              >
                <ShieldCheck
                  className={cn(
                    "transition-colors",
                    loginRequired ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <div>
                  <h4 className="font-semibold">Wajibkan Login</h4>
                  <p className="text-xs text-muted-foreground">
                    Pengguna harus login dengan akun Google untuk mengakses
                    tautan ini.
                  </p>
                </div>
                <input
                  id="loginRequired"
                  type="checkbox"
                  checked={loginRequired}
                  onChange={(e) => setLoginRequired(e.target.checked)}
                  className="ml-auto h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => generateLink("timed")}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  <Copy size={16} /> Salin Tautan Berwaktu
                </button>
                <button
                  onClick={() => generateLink("session")}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  <Copy size={16} /> Salin Tautan Sesi
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (controlledIsOpen !== undefined) {
    return ModalContent;
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground"
        title="Bagikan Folder/File Ini"
      >
        <Share2 size={18} />
      </button>
      {ModalContent}
    </>
  );
}
