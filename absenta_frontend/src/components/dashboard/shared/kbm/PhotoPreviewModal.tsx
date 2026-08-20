import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, User, Calendar, ImageIcon, AlertTriangle } from 'lucide-react';
import { Button } from '../../../ui';
import { resolveProfilePhotoUrl } from '../../../../lib/utils';
import { createPortal } from 'react-dom';

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
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!isOpen || !photoUrl) return null;

  const resolvedPhoto = resolveProfilePhotoUrl(photoUrl);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
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
          <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[65vh] overflow-hidden p-2">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Memuat Foto KBM...</span>
              </div>
            )}

            {imageError ? (
              <div className="py-16 text-center space-y-2 text-slate-400">
                <AlertTriangle size={36} className="text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-slate-300">Gagal memuat file foto bukti KBM.</p>
                <p className="text-[10px] text-slate-500 font-mono max-w-sm truncate">{photoUrl}</p>
              </div>
            ) : (
              <img
                src={resolvedPhoto}
                alt="Foto Bukti Pembelajaran Kelas"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  // Fallback: If resolved URL fails, try raw photoUrl before giving up
                  if (photoUrl && photoUrl !== resolvedPhoto) {
                    setImageError(false);
                  } else {
                    setImageError(true);
                  }
                }}
                className={cn(
                  "max-h-[62vh] w-auto object-contain rounded-xl shadow-lg transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
              />
            )}
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
              {!imageError && (
                <a
                  href={resolvedPhoto}
                  download="foto_kegiatan_kbm.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <Download size={13} />
                  <span>Unduh Foto</span>
                </a>
              )}
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
    </AnimatePresence>,
    document.body
  );
};
