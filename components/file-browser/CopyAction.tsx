"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CopyActionProps {
  fileId: string;
  currentFolderId: string;
  fileName?: string;
}

export default function CopyAction({
  fileId,
  currentFolderId,
  fileName,
}: CopyActionProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    setLoading(true);
    try {
      const newName = fileName ? `Copy of ${fileName}` : undefined;
      await fetch("/api/file/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          destinationId: currentFolderId,
          newName,
        }),
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} disabled={loading}>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        "Duplicate File"
      )}
    </Button>
  );
}
