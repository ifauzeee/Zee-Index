"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";
const CodeViewer = dynamic(
  () => import("@/components/file-details/CodeViewer"),
);

interface FolderReadmeProps {
  fileId: string;
}

export default function FolderReadme({ fileId }: FolderReadmeProps) {
  const { shareToken, addToast } = useAppStore();
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchReadme = async () => {
      setIsLoading(true);
      try {
        let url = `/api/download?fileId=${fileId}`;
        if (shareToken) url += `&share_token=${shareToken}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load README");
        const text = await response.text();
        setContent(text);
      } catch {
        addToast({ message: "Gagal memuat README", type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    if (fileId) {
      fetchReadme();
    }
  }, [fileId, shareToken, addToast]);

  if (isLoading) return null;
  if (!content) return null;

  return (
    <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <BookOpen size={16} className="text-primary" />
          <span>README.md</span>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-6 prose dark:prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return match ? (
                      <CodeViewer
                        language={match[1]}
                        content={String(children).replace(/\n$/, "")}
                        className="my-4"
                      />
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
