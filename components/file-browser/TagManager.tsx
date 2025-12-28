"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TagManagerProps {
  fileId: string;
}

export default function TagManager({ fileId }: TagManagerProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    fetch(`/api/tags?fileId=${fileId}`)
      .then((res) => res.json())
      .then((data) => setTags(data.tags));
  }, [fileId]);

  const handleUpdate = async (tag: string, action: "add" | "remove") => {
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId, tag, action }),
    });

    if (action === "add") {
      setTags([...tags, tag]);
      setNewTag("");
    } else {
      setTags(tags.filter((t) => t !== tag));
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 flex-wrap">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => handleUpdate(tag, "remove")}
          >
            {tag} ×
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="New Label..."
          className="h-8"
        />
        <Button size="sm" onClick={() => handleUpdate(newTag, "add")}>
          Add
        </Button>
      </div>
    </div>
  );
}
