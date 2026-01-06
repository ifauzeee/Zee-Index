import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";

interface CodeViewerProps {
  content: string;
  language: string;
  className?: string;
}

export function CodeViewer({ content, language, className }: CodeViewerProps) {
  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden border shadow-sm bg-[#1e1e1e]",
        className,
      )}
    >
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: "1.5rem", fontSize: "0.875rem" }}
        showLineNumbers
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}

export default CodeViewer;
