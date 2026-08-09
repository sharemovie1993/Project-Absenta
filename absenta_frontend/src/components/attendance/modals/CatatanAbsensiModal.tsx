import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, FileText, Zap, X, Check, Loader2 } from 'lucide-react';
import Button from '../../ui/Button';

interface CatatanAbsensiModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  status: 'SAKIT' | 'IZIN' | 'DISPEN' | string;
  onSubmit: (catatan: string) => Promise<void> | void;
}

const QUICK_NOTES: Record<string, string[]> = {
  SAKIT: ['Demam & Flu', 'Surat Dokter', 'Sakit Perut', 'Rawat Inap'],
  IZIN: ['Acara Keluarga', 'Keperluan Keluarga', 'Keluarga Berduka', 'Mudik'],
  DISPEN: ['Tugas Sekolah', 'Lomba / Kompetisi', 'Kegiatan Organisasi', 'Latihan Event'],
};

export const CatatanAbsensiModal: React.FC<CatatanAbsensiModalProps> = React.memo(({
  isOpen,
  onClose,
  studentName,
  status,
  onSubmit,
}) => {
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCatatan('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(catatan.trim());
      onClose();
    } catch (err) {
      console.error('Submit catatan error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTheme = () => {
    switch (status) {
      case 'SAKIT':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
          icon: Stethoscope,
          badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200',
          label: 'Sakit',
        };
      case 'IZIN':
        return {
          bg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
          icon: FileText,
          badgeBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-200',
          label: 'Izin',
        };
      case 'DISPEN':
        return {
          bg: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-800',
          icon: Zap,
          badgeBg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200',
          label: 'Dispensasi',
        };
      default:
        return {
          bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
          icon: FileText,
          badgeBg: 'bg-indigo-100 text-indigo-700',
          label: status,
        };
    }
  };

  const theme = getStatusTheme();
  const IconComponent = theme.icon;
  const suggestions = QUICK_NOTES[status] || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl border ${theme.bg}`}>
                <IconComponent size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Alasan {theme.label}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${theme.bg}`}>
                    {theme.label}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                  {studentName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Keterangan / Alasan Tambahan
              </label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder={`Contoh: ${suggestions[0] || 'Alasan ketidakhadiran...'}`}
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 transition-all resize-none"
                autoFocus
              />
            </div>

            {/* Quick Suggestion Badges */}
            {suggestions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Pilih Alasan Cepat:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCatatan(item)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${theme.badgeBg}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl text-xs px-4"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl text-xs px-5 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Simpan Status</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});
