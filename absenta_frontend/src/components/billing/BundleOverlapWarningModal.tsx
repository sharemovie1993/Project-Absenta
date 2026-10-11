import React from 'react';
import { 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/utils/layoutUtils';

interface BundleOverlapWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBundle?: any;
  targetModuleName?: string;
  onExtendBundle: () => void;
  onProceedSingle: () => void;
}

export const BundleOverlapWarningModal: React.FC<BundleOverlapWarningModalProps> = ({
  isOpen,
  onClose,
  activeBundle,
  targetModuleName = 'Modul Satuan',
  onExtendBundle,
  onProceedSingle
}) => {
  const endDate = activeBundle?.end_date ? new Date(activeBundle.end_date) : null;
  const formattedEndDate = endDate ? formatDate(endDate, { day: 'numeric', month: 'long', year: 'numeric' }) : 'dalam waktu dekat';
  const daysLeft = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 3600 * 24)) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Peringatan: Paket Lengkap Masih Aktif
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Konfirmasi Keputusan Pemesanan Modul Sekolah
            </p>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Banner Status Paket Lengkap Aktif */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-indigo-50/50 to-blue-50/40 dark:from-amber-950/30 dark:via-indigo-950/20 dark:to-blue-950/20 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
            <Sparkles size={16} />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">
                Paket Lengkap All-in-One Sedang Aktif
              </span>
              <Badge variant="warning" className="text-[9px] font-black uppercase px-1.5 py-0.2">
                {daysLeft > 0 ? `Sisa ${daysLeft} Hari` : 'Aktif'}
              </Badge>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
              Sekolah Anda saat ini memiliki langganan <strong>Paket Lengkap</strong> aktif sampai{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">{formattedEndDate}</strong>. Modul{' '}
              <strong>{targetModuleName}</strong> ini <u>sudah termasuk</u> di dalamnya bersama POS Koperasi, Hubin PKL, Sarpras, WA Gateway, dan Easy Tunnel.
            </p>
          </div>
        </div>

        {/* Dampak Pemesanan Satuan */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1.5">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
            <ShieldAlert size={14} className="shrink-0" />
            <span>Penting untuk Diperhatikan:</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Membeli modul satuan <strong>{targetModuleName}</strong> tidak akan memperpanjang modul-modul lainnya. Begitu masa aktif Paket Lengkap berakhir, modul lain sekolah Anda akan <strong>otomatis terkunci</strong>.
          </p>
        </div>

        {/* Pilihan Tindakan Admin */}
        <div className="space-y-2.5 pt-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Pilih tindakan yang Anda inginkan:
          </p>

          {/* Opsi 1: Rekomendasi Perpanjang Paket Lengkap */}
          <div 
            onClick={() => {
              onClose();
              onExtendBundle();
            }}
            className="p-3.5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/70 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Layers size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                    Perpanjang Paket Lengkap
                  </h4>
                  <Badge variant="success" className="text-[8px] font-black uppercase px-1.5 py-0.2">
                    Direkomendasikan
                  </Badge>
                </div>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 leading-snug mt-0.5">
                  Menjaga seluruh 6 modul sekolah tetap aktif bersamaan tanpa gangguan operasional.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Opsi 2: Tetap Beli Modul Satuan (Downgrade Disengaja) */}
          <div 
            onClick={() => {
              onClose();
              onProceedSingle();
            }}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                <Calendar size={17} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tetap Beli Hanya Modul {targetModuleName} (Downgrade)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  Saya memahami bahwa modul lain sekolah akan dinonaktifkan saat Paket Lengkap berakhir.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-400 shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-bold"
          >
            Batal
          </Button>
        </div>
      </div>
    </Modal>
  );
};
