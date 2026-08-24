import React from 'react';
import { Users, Network, FileText, ChevronRight, X } from 'lucide-react';

interface MethodChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'ANGGOTA' | 'PEMBINA' | null;
  onSelectDirect: () => void;
  onSelectMatrix: () => void;
}

export const MethodChoiceModal: React.FC<MethodChoiceModalProps> = React.memo(({
  isOpen,
  onClose,
  type,
  onSelectDirect,
  onSelectMatrix
}) => {
  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Pilih Metode Penugasan {type === 'ANGGOTA' ? 'Anggota' : 'Pembina'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Tentukan antarmuka yang paling nyaman untuk Anda</p>
            </div>
          </div>
          <button 
            type="button"
            aria-label="Tutup modal"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 gap-4">
          <button
            type="button"
            onClick={onSelectDirect}
            className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-indigo-500/80 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all text-left group"
          >
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Formulir Pemetaan Cepat
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pilih satu kegiatan dan petakan {type === 'ANGGOTA' ? 'banyak siswa' : 'guru pembina'} sekaligus melalui modal interaktif.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectMatrix}
            className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-emerald-500/80 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all text-left group"
          >
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Network className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  Matriks Checklist Grid
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Buka lembar kerja matriks penuh untuk mencentang pendaftaran anggota per eskul dalam satu tampilan grid luas.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
});
