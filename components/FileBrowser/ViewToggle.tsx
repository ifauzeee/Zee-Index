"use client";

import { LayoutGrid, List as ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  currentView: "list" | "grid";
  onToggle: (view: "list" | "grid") => void;
}

export default function ViewToggle({ currentView, onToggle }: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-md p-1 gap-1 bg-background">
      <Button
        variant={currentView === "list" ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={() => onToggle("list")}
        aria-label="List view"
      >
        <ListIcon className="h-4 w-4" />
      </Button>
      <Button
        variant={currentView === "grid" ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={() => onToggle("grid")}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
