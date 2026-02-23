"use client";

import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { Copy, Check, FileCode } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface CodeViewerProps {
  content: string;
  language: string;
  className?: string;
  fileName?: string;
}

export function CodeViewer({
  content,
  language,
  className,
  fileName,
}: CodeViewerProps) {
  const { addToast } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const displayLanguage = language === "clike" ? "cpp" : language;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    addToast({ message: "Code copied to clipboard", type: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex flex-col w-full h-full bg-[#1e1e1e] border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all duration-300",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-white/5 z-10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 px-1">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <div className="flex items-center gap-2 text-zinc-400">
            <FileCode size={14} className="text-blue-400" />
            <span className="text-xs font-medium font-mono truncate max-w-[200px]">
              {fileName || "code.txt"}
            </span>
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-wider text-zinc-500">
              {displayLanguage}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-md p-1 mr-2 invisible md:visible">
            <button
              onClick={() => setFontSize(Math.max(10, fontSize - 1))}
              className="px-2 text-zinc-500 hover:text-white transition-colors"
            >
              -
            </button>
            <span className="text-[10px] text-zinc-500 font-mono w-4 text-center">
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 1))}
              className="px-2 text-zinc-500 hover:text-white transition-colors"
            >
              +
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-white/5 flex items-center gap-2 group"
          >
            {copied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} />
            )}
            <span className="text-[10px] font-bold uppercase hidden sm:inline">
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <Editor
          height="100%"
          defaultLanguage={displayLanguage}
          value={content}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: true, scale: 0.75, side: "right" },
            scrollBeyondLastLine: false,
            fontSize: fontSize,
            fontFamily: "'Fira Code', 'Courier New', monospace",
            fontLigatures: true,
            automaticLayout: true,
            lineNumbers: "on",
            roundedSelection: true,
            padding: { top: 20, bottom: 20 },
            cursorStyle: "line",
            folding: true,
            glyphMargin: false,
            renderLineHighlight: "all",
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
        />
      </div>
    </div>
  );
}

export default CodeViewer;
