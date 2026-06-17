import React from 'react';
import { Sparkles } from 'lucide-react';
import Button from '../../ui/Button';
import type { ConfirmTxData } from './types';

interface QuickTxConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmTxData: ConfirmTxData | null;
  processingQuickTx: boolean;
  onConfirm: () => void;
  formatTerbilang: (amount: number) => string;
}

export const QuickTxConfirmModal: React.FC<QuickTxConfirmModalProps> = ({
  isOpen,
  onClose,
  confirmTxData,
  processingQuickTx,
  onConfirm,
  formatTerbilang
}) => {
  if (!isOpen || !confirmTxData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative mx-4 transform transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="text-indigo-600 dark:text-indigo-400 animate-pulse" size={18} />
            Konfirmasi Otentikasi Transaksi
          </h3>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="text-center py-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
              confirmTxData.type === 'DEPOSIT'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              {confirmTxData.type === 'DEPOSIT' ? 'SETOR TUNAI (KREDIT)' : 'PENARIKAN TUNAI (DEBET)'}
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-2">
              Rp {confirmTxData.amount.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic px-4 font-semibold mt-1">
              "{formatTerbilang(confirmTxData.amount)}"
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800/40 pb-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nama Anggota</span>
              <span className="font-extrabold text-slate-700 dark:text-slate-350">{confirmTxData.memberName}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800/40 pb-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">No. Anggota</span>
              <span className="font-extrabold text-slate-700 dark:text-slate-350">{confirmTxData.memberNo}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800/40 pb-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Jenis Simpanan</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{confirmTxData.savingType}</span>
            </div>
            <div className="flex justify-between text-xs pb-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Keterangan</span>
              <span className="font-extrabold text-slate-700 dark:text-slate-350 truncate max-w-[200px]">{confirmTxData.description || '-'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/60 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
          >
            Batal
          </button>
          
          <Button
            type="button"
            isLoading={processingQuickTx}
            onClick={onConfirm}
            variant={confirmTxData.type === 'DEPOSIT' ? 'success' : 'danger'}
            className="py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            Konfirmasi & Cetak Slip
          </Button>
        </div>
      </div>
    </div>
  );
};
