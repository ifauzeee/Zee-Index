"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import FileRequestModal from "./FileRequestModal";
import ImageEditorModal from "./ImageEditorModal";
import ContextMenu from "./ContextMenu";
import RenameModal from "./RenameModal";
import DeleteConfirm from "./DeleteConfirm";
import ShareButton from "./ShareButton";
import MoveModal from "./MoveModal";
import UploadModal from "./UploadModal";
import FileDetail from "./FileDetail";
import ArchivePreviewModal from "./ArchivePreviewModal";
import FileRevisionsModal from "./FileRevisionsModal";
import type { DriveFile } from "@/lib/googleDrive";
import type { ActionState, ContextMenuState } from "@/hooks/useFileActions";
import FileList from "@/components/FileList";
import { useTranslations } from "next-intl";

interface FileBrowserModalsProps {
  authModal: { isOpen: boolean; folderId: string; folderName: string };
  isAuthLoading: boolean;
  onCloseAuth: () => void;
  onAuthSubmit: (id: string, pass: string) => void;

  isFileRequestModalOpen: boolean;
  setIsFileRequestModalOpen: (open: boolean) => void;
  currentFolderId: string;
  folderName: string;
  imageEditorFile: DriveFile | null;
  setImageEditorFile: (file: DriveFile | null) => void;
  contextMenu: ContextMenuState;
  setContextMenu: (state: ContextMenuState) => void;
  actionState: ActionState;
  setActionState: (state: ActionState) => void;
  handleRename: (newName: string) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleShare: (file: DriveFile | null) => void;
  handleMove: (newParentId: string) => Promise<void>;
  handleToggleFavorite: () => void;
  handleCopy: () => void;
  handleArchivePreview: () => void;
  previewFile: DriveFile | null;
  setPreviewFile: (file: DriveFile | null) => void;
  archivePreview: DriveFile | null;
  setArchivePreview: (file: DriveFile | null) => void;
  detailsFile: DriveFile | null;
  setDetailsFile: (file: DriveFile | null) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  droppedFiles: FileList | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDropUpload: (e: React.DragEvent) => Promise<void>;
  isDragging: boolean;
  isAdmin: boolean;
  getSharePath: (file: DriveFile) => string;
  favorites: string[];
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  handleTogglePin: () => void;
  isFilePinned: (id: string) => boolean;
}

export default function FileBrowserModals(props: FileBrowserModalsProps) {
  const {
    authModal = { isOpen: false, folderId: "", folderName: "" },
    isFileRequestModalOpen,
    setIsFileRequestModalOpen,
    currentFolderId,
    folderName,
    imageEditorFile,
    setImageEditorFile,
    contextMenu,
    setContextMenu,
    actionState = { type: null, file: null },
    setActionState,
    handleRename,
    handleDelete,
    handleShare,
    handleMove,
    handleToggleFavorite,
    handleCopy,
    handleArchivePreview,
    previewFile,
    setPreviewFile,
    archivePreview,
    setArchivePreview,
    setDetailsFile,
    isUploadModalOpen,
    setIsUploadModalOpen,
    droppedFiles,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDropUpload,
    isDragging,
    isAdmin,
    getSharePath,
    favorites,
    showHistory,
    setShowHistory,
    handleTogglePin,
    isFilePinned,
  } = props;
  const t = useTranslations("FileBrowserModals");
  const ARCHIVE_PREVIEW_LIMIT_BYTES = 100 * 1024 * 1024;

  useEffect(() => {
    if (
      authModal.isOpen ||
      isFileRequestModalOpen ||
      imageEditorFile ||
      previewFile ||
      archivePreview ||
      showHistory ||
      isUploadModalOpen ||
      actionState.type !== null
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [
    authModal.isOpen,
    isFileRequestModalOpen,
    imageEditorFile,
    previewFile,
    archivePreview,
    showHistory,
    isUploadModalOpen,
    actionState.type,
  ]);

  return (
    <AnimatePresence>
      {isFileRequestModalOpen && (
        <FileRequestModal
          folderId={currentFolderId}
          folderName={folderName}
          onClose={() => setIsFileRequestModalOpen(false)}
        />
      )}
      {imageEditorFile && (
        <ImageEditorModal
          file={imageEditorFile}
          onClose={() => setImageEditorFile(null)}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          isImage={contextMenu.file.mimeType.startsWith("image/")}
          onEditImage={() => {
            setImageEditorFile(contextMenu.file);
            setContextMenu(null);
          }}
          onRename={() => {
            setActionState({ type: "rename", file: contextMenu.file });
            setContextMenu(null);
          }}
          onDelete={() => {
            setActionState({ type: "delete", file: contextMenu.file });
            setContextMenu(null);
          }}
          onShare={() => {
            handleShare(contextMenu.file);
            setContextMenu(null);
          }}
          onMove={() => {
            setActionState({ type: "move", file: contextMenu.file });
            setContextMenu(null);
          }}
          isFavorite={favorites.includes(contextMenu.file.id)}
          onToggleFavorite={handleToggleFavorite}
          onCopy={handleCopy}
          onShowDetails={() => {
            setDetailsFile(contextMenu.file);
            setContextMenu(null);
          }}
          onPreview={() => {
            if (!contextMenu.file.isFolder) setPreviewFile(contextMenu.file);
            setContextMenu(null);
          }}
          isArchive={
            contextMenu.file.mimeType === "application/zip" ||
            contextMenu.file.mimeType.includes("compressed") ||
            contextMenu.file.mimeType.includes("tar")
          }
          isArchivePreviewable={
            (contextMenu.file.mimeType === "application/zip" ||
              contextMenu.file.mimeType.includes("compressed")) &&
            parseInt(contextMenu.file.size || "0", 10) <=
              ARCHIVE_PREVIEW_LIMIT_BYTES
          }
          onArchivePreview={handleArchivePreview}
          isFolder={contextMenu.file.isFolder}
          isPinned={isFilePinned(contextMenu.file.id)}
          onTogglePin={handleTogglePin}
          isAdmin={isAdmin}
        />
      )}
      {actionState.type === "rename" && actionState.file && (
        <RenameModal
          currentName={actionState.file.name}
          onClose={() => setActionState({ type: null, file: null })}
          onRename={handleRename}
        />
      )}
      {actionState.type === "delete" && actionState.file && (
        <DeleteConfirm
          itemName={actionState.file.name}
          onClose={() => setActionState({ type: null, file: null })}
          onConfirm={handleDelete}
        />
      )}
      {actionState.type === "share" && actionState.file && (
        <ShareButton
          path={getSharePath(actionState.file)}
          itemName={actionState.file.name}
          isOpen={true}
          onClose={() => setActionState({ type: null, file: null })}
        />
      )}
      {actionState.type === "move" && actionState.file && (
        <MoveModal
          fileToMove={actionState.file}
          onClose={() => setActionState({ type: null, file: null })}
          onConfirmMove={handleMove}
        />
      )}
      {isUploadModalOpen && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          initialFiles={droppedFiles}
          handleFileSelect={handleFileSelect}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDropUpload={handleDropUpload}
          isDragging={isDragging}
        />
      )}
      {previewFile && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          onClick={() => setPreviewFile(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="relative w-full h-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <FileDetail
              file={previewFile}
              isModal={true}
              onCloseModal={() => setPreviewFile(null)}
            />
          </div>
        </motion.div>
      )}
      {archivePreview && (
        <ArchivePreviewModal
          file={archivePreview}
          onClose={() => setArchivePreview(null)}
        />
      )}
      {showHistory && contextMenu?.file && (
        <FileRevisionsModal
          fileId={contextMenu.file.id}
          fileName={contextMenu.file.name}
          onClose={() => setShowHistory(false)}
        />
      )}
      {isDragging && isAdmin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/30 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center justify-center p-12 bg-background rounded-lg shadow-2xl ring-4 ring-primary ring-dashed">
            <UploadCloud className="h-24 w-24 text-primary" />
            <p className="mt-4 text-2xl font-semibold text-foreground">
              {t("dropToUpload")}
            </p>
            <p className="text-muted-foreground">{t("toThisFolder")}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
