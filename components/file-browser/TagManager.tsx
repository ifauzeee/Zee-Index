"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { getTags, addTag, removeTag } from "@/app/actions/tags";

interface TagManagerProps {
  fileId: string;
}

export default function TagManager({ fileId }: TagManagerProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const t = useTranslations("TagManager");

  useEffect(() => {
    getTags(fileId).then((data) => setTags(data.tags));
  }, [fileId]);

  const handleUpdate = async (tag: string, action: "add" | "remove") => {
    if (action === "add") {
      await addTag(fileId, tag);
      setTags([...tags, tag]);
      setNewTag("");
    } else {
      await removeTag(fileId, tag);
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
          placeholder={t("newLabelPlaceholder")}
          className="h-8"
        />
        <Button size="sm" onClick={() => handleUpdate(newTag, "add")}>
          {t("add")}
        </Button>
      </div>
    </div>
  );
}
