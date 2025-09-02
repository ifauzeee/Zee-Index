// components/FileItem.tsx
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from '@/lib/store';
import { formatBytes } from '@/lib/utils';
import { getIcon } from '@/lib/utils';

interface FileItemProps {
  file: DriveFile;
  onClick: () => void;
  isSelected: boolean;
  isBulkMode: boolean;
}

export default function FileItem({ file, onClick, isSelected, isBulkMode }: FileItemProps) {
  const { view } = useAppStore();
  const icon = getIcon(file);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  const commonClasses = `file-item rounded-lg border cursor-pointer transition-all duration-200 ${
    isSelected ? 'bg-accent/20 border-primary' : 'border-transparent hover:border-primary/50 hover:bg-accent/50'
  }`;

  const listView = (
    <motion.div onClick={onClick} className={`${commonClasses} p-3 flex items-center gap-4`} variants={itemVariants}>
      {isBulkMode && (
         <input type="checkbox" checked={isSelected} readOnly className="form-checkbox h-5 w-5 rounded bg-card border-border text-primary focus:ring-0 pointer-events-none" />
      )}
      <i className={`fas ${icon} text-xl w-8 text-center text-muted-foreground`}></i>
      <span className="flex-1 truncate font-medium">{file.name}</span> {/* PERBAIKAN: Gunakan truncate */}
      {file.isProtected && <i className="fas fa-lock text-xs text-muted-foreground ml-1"></i>}
      <span className="text-sm text-right w-24 shrink-0 text-muted-foreground">
        {file.isFolder ? '-' : formatBytes(Number(file.size))}
      </span>
    </motion.div>
  );

  const gridView = (
    <motion.div onClick={onClick} className={`${commonClasses} p-2 flex flex-col h-48 overflow-hidden`} variants={itemVariants}>
      <div className="relative w-full flex-grow">
        {isBulkMode && (
          <div className="absolute top-2 left-2 z-10">
            <input type="checkbox" checked={isSelected} readOnly className="form-checkbox h-5 w-5 rounded bg-card border-border text-primary focus:ring-0 pointer-events-none" />
          </div>
        )}
        <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-md overflow-hidden">
          {file.hasThumbnail && !file.isFolder && file.thumbnailLink ? (
            <Image 
              src={file.thumbnailLink.replace(/=s\d+/, '=s220')} 
              alt={file.name}
              width={220}
              height={130}
              className="w-full h-full object-cover"
            />
          ) : (
            <i className={`fas ${icon} text-5xl text-muted-foreground/50`}></i>
          )}
        </div>
      </div>
      <p className="p-2 text-xs font-medium truncate flex items-center">{file.name}</p> {/* PERBAIKAN: Gunakan truncate */}
    </motion.div>
  );

  return view === 'list' ? listView : gridView;
}