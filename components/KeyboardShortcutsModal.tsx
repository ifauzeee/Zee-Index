"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Command, Search, Delete, Edit2 } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslations } from "next-intl";

export default function KeyboardShortcutsModal() {
  const t = useTranslations("KeyboardShortcutsModal");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "?" &&
        e.shiftKey &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useScrollLock(isOpen);

  if (!isOpen) return null;

  const shortcuts = [
    { keys: ["Cmd/Ctrl", "K"], label: t("openCommandPalette"), icon: Command },
    { keys: ["Shift", "?"], label: t("openHelp"), icon: Keyboard },
    { keys: ["/"], label: t("focusSearch"), icon: Search },
    { keys: ["Esc"], label: t("closeModal"), icon: X },
    { keys: ["Space"], label: t("previewFile"), icon: Keyboard },
    { keys: ["Del"], label: t("deleteFile"), icon: Delete },
    { keys: ["F2"], label: t("renameFile"), icon: Edit2 },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-background rounded-xl shadow-2xl border border-border overflow-hidden"
        >
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Keyboard className="text-primary" /> {t("keyboardShortcuts")}
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 grid gap-4">
            {shortcuts.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </div>
                <div className="flex gap-1">
                  {item.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-2 py-1 bg-muted border border-border rounded-md text-xs font-mono font-bold text-foreground shadow-sm"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-muted/30 text-center text-xs text-muted-foreground">
            {t("press")} <kbd className="font-bold">Esc</kbd> {t("toClose")}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
