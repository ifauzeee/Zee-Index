"use client";
import React, { useState } from "react";
import { ChevronRight, Folder, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

interface BreadcrumbDropdownProps {
  parentId: string;
  nextId?: string;
  onFolderClick: (id: string) => void;
}

export function BreadcrumbDropdown({
  parentId,
  nextId,
  onFolderClick,
}: BreadcrumbDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { shareToken, folderTokens } = useAppStore();

  const folderToken = folderTokens[parentId];

  const { data, isLoading } = useQuery({
    queryKey: ["sibling-folders", parentId, shareToken, folderToken],
    queryFn: async () => {
      const url = new URL(window.location.origin + "/api/files");
      url.searchParams.append("folderId", parentId);
      if (shareToken) url.searchParams.append("share_token", shareToken);

      const headers = new Headers();
      if (folderToken) {
        headers.append("Authorization", `Bearer ${folderToken}`);
      }

      const response = await fetch(url.toString(), { headers });
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      return (result.files || []).filter(
        (f: any) => f.isFolder && f.id !== nextId,
      );
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "p-1 hover:bg-accent rounded-md transition-all group shrink-0 mx-0.5",
            isOpen && "bg-accent",
          )}
        >
          <ChevronRight
            size={14}
            className={cn(
              "text-muted-foreground opacity-50 transition-all group-hover:scale-125 group-hover:opacity-100",
              isOpen && "rotate-90 opacity-100 text-primary",
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 max-h-[300px] overflow-y-auto bg-card/95 backdrop-blur-md border-border shadow-2xl p-1 z-[100]"
      >
        <div className="px-2 py-1.5 mb-1 border-b border-border/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Pindah ke Folder Lain
          </p>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-6 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground">
              Memuat folder...
            </span>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-4 text-[11px] text-muted-foreground text-center italic">
            Tidak ada folder lain di level ini
          </div>
        ) : (
          <div className="grid gap-0.5">
            {data.map((folder: any) => (
              <DropdownMenuItem
                key={folder.id}
                onClick={() => onFolderClick(folder.id)}
                className="flex items-center gap-2.5 cursor-pointer rounded-lg hover:bg-primary/10 transition-colors py-2 px-2.5"
              >
                <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <Folder
                    size={14}
                    className="text-blue-500 fill-blue-500/20"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {folder.name}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
