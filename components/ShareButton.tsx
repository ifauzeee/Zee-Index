// components/ShareButton.tsx
"use client";

import { useState } from 'react';
import { Share2, X, Clock, Zap, Copy } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareButtonProps {
  path: string;
  itemName: string;
}

type TimeUnit = 's' | 'm' | 'h' | 'd';

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

export default function ShareButton({ path, itemName }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const addToast = useAppStore((state) => state.addToast);

  const [customDuration, setCustomDuration] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<TimeUnit>('d'); // s: detik, m: menit, h: jam, d: hari

  const generateLink = async (type: 'timed' | 'session') => {
    try {
      const expiresIn = type === 'timed' ? `${customDuration}${customUnit}` : undefined;

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type, expiresIn }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal membuat tautan.');
      }

      const { shareableUrl } = await response.json();
      await navigator.clipboard.writeText(shareableUrl);
      addToast({ message: 'Tautan berbagi telah disalin!', type: 'success' });
      setIsOpen(false);
    } catch (error) {
      addToast({ message: (error as Error).message, type: 'error' });
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-foreground"
        title="Bagikan Folder/File Ini"
      > 
        <Share2 size={20} />
        <span className="hidden sm:inline">Bagikan</span>
      </button> 
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
          >
            <motion.div 
              className="relative w-full max-w-md bg-background p-6 rounded-lg shadow-xl"
              variants={modalVariants}
            >
              <button onClick={() => setIsOpen(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"> 
                <X size={20} /> 
              </button> 
              <h3 className="text-lg font-semibold mb-1 whitespace-normal break-words">Bagikan: {itemName}</h3> 
              <p className="text-sm text-muted-foreground mb-6">Pilih jenis tautan berbagi.</p> 
 
              {/* --- BAGIAN OPSI LINK BERWAKTU --- */}
              <div className="p-4 rounded-lg mb-4"> 
                <div className="flex items-center gap-3 mb-3"> 
                  <Clock className="text-primary"/> 
                  <h4 className="font-semibold">Tautan Berwaktu</h4> 
                </div> 
                <p className="text-xs text-muted-foreground mb-3">Tautan akan kedaluwarsa setelah durasi yang Anda tentukan.</p> 
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-1/3 px-3 py-2 rounded-md border bg-background focus:ring-2 focus:ring-ring focus:outline-none text-sm"
                    min="1"
                  />
                  <select 
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as TimeUnit)}
                    className="w-2/3 px-3 py-2 rounded-md border bg-background focus:ring-2 focus:ring-ring focus:outline-none text-sm"> 
                    <option value="s">Detik</option> 
                    <option value="m">Menit</option> 
                    <option value="h">Jam</option> 
                    <option value="d">Hari</option>
                  </select> 
                  <button onClick={() => generateLink('timed')} className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"> 
                    <Copy size={16} /> 
                  </button> 
                </div> 
              </div> 

              {/* --- BAGIAN OPSI LINK TANPA BATAS WAKTU --- */}
              <div className="p-4 rounded-lg"> 
                <div className="flex items-center gap-3 mb-3"> 
                  <Zap className="text-amber-500"/> 
                  <h4 className="font-semibold">Tautan Tanpa Batas Waktu</h4> 
                </div> 
                <p className="text-xs text-muted-foreground mb-3">Tautan ini tidak akan kedaluwarsa dan tetap aktif sampai dihentikan.</p> 
                <button onClick={() => generateLink('session')} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"> 
                  <Copy size={16} /> Salin Tautan Permanen 
                </button> 
              </div> 
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}