import React from "react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface CodeViewerProps {
  content: string;
  language: string;
  className?: string;
}

export function CodeViewer({ content, language, className }: CodeViewerProps) {
  const { theme } = useTheme();

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden border shadow-sm h-[500px]",
        className,
      )}
    >
      <Editor
        height="100%"
        defaultLanguage={language}
        value={content}
        theme={theme === "dark" ? "vs-dark" : "light"}
        options={{
          readOnly: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          automaticLayout: true,
        }}
      />
    </div>
  );
}

export default CodeViewer;
