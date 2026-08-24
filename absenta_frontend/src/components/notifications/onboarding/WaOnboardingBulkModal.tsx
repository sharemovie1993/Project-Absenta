import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

interface WaOnboardingBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSending: boolean;
  totalBelum: number;
  roleFilterLabel: string;
}

export function WaOnboardingBulkModal({
  isOpen,
  onClose,
  onConfirm,
  isSending,
  totalBelum,
  roleFilterLabel,
}: WaOnboardingBulkModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 text-amber-400">
          <div className="p-2.5 bg-amber-950/60 border border-amber-800/60 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Konfirmasi Sapa Masal WA Bot</h3>
            <p className="text-xs text-slate-400">Filter Aktif: {roleFilterLabel}</p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
          <p>
            Sistem akan memasukkan jadwal pengiriman pesan sapaan WA untuk{' '}
            <strong className="text-emerald-400 font-bold">{totalBelum} pengguna</strong> yang berstatus{' '}
            <strong className="text-rose-400 font-bold">Belum Komunikasi</strong>.
          </p>
          <p className="text-slate-400 text-[11px]">
            *Pesan akan dikirim secara berkala (antrean background queue) dengan pembatasan durasi agar aman dari spam filter.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg bg-slate-800 transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isSending}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/40 transition disabled:opacity-50"
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>Proses Sapa Masal ({totalBelum})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
