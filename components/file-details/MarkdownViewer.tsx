import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export default function MarkdownViewer({
  content,
  className,
}: MarkdownViewerProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none w-full bg-background p-4 md:p-8",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
