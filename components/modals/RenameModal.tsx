"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ModalShell from "@/components/ui/ModalShell";

interface RenameModalProps {
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
}

export default function RenameModal({
  currentName,
  onClose,
  onRename,
}: RenameModalProps) {
  const [newName, setNewName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("RenameModal");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onRename(newName);
    setIsLoading(false);
  };

  return (
    <ModalShell onClose={onClose} title={t("title")}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full px-3 py-2 rounded-md border bg-background focus:ring-2 focus:ring-ring focus:outline-none"
          autoFocus
          onFocus={(e) => e.target.select()}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md hover:bg-accent"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isLoading || !newName || newName === currentName}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50"
          >
            {isLoading ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
