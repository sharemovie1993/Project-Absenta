import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, User, Calendar } from 'lucide-react';
import { Button } from '../../../ui';

export interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string | null;
  guruNama?: string;
  kelasNama?: string;
  mapelNama?: string;
  timestamp?: string;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  guruNama,
  kelasNama,
  mapelNama,
  timestamp,
}) => {
  if (!isOpen || !photoUrl) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ✓ FOTO BUKTI KBM TERVERIFIKASI
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                {mapelNama || 'Sesi Pembelajaran'} • {kelasNama || 'Kelas'}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image Viewport */}
          <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-hidden p-2">
            <img
              src={photoUrl}
              alt="Foto Bukti Pembelajaran Kelas"
              className="max-h-[68vh] w-auto object-contain rounded-xl shadow-lg"
            />
          </div>

          {/* Footer Meta */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-4 flex-wrap">
              {guruNama && (
                <div className="flex items-center gap-1.5 font-semibold">
                  <User size={14} className="text-slate-400" />
                  <span>{guruNama}</span>
                </div>
              )}
              {timestamp && (
                <div className="flex items-center gap-1.5 font-mono text-slate-400">
                  <Calendar size={14} />
                  <span>{timestamp}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={photoUrl}
                download="foto_kegiatan_kbm.jpg"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <Download size={13} />
                <span>Unduh Foto</span>
              </a>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onClose}
                className="rounded-xl text-xs font-black"
              >
                Tutup
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
