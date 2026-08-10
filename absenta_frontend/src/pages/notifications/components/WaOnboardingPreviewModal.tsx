import React from 'react';
import { Send, RefreshCw, Smartphone } from 'lucide-react';
import type { WaOnboardingUser } from '@/api/whatsapp.api';

interface WaOnboardingPreviewModalProps {
  user: WaOnboardingUser | null;
  customMsg: string;
  onCustomMsgChange: (msg: string) => void;
  onClose: () => void;
  onSend: () => void;
  isSending: boolean;
}

export function WaOnboardingPreviewModal({
  user,
  customMsg,
  onCustomMsgChange,
  onClose,
  onSend,
  isSending,
}: WaOnboardingPreviewModalProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Preview Pesan Sapaan WA Bot</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded bg-slate-800"
          >
            ✕ Tutup
          </button>
        </div>

        <div className="space-y-2">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-300">
            <span className="font-semibold text-emerald-400">Penerima:</span> {user.nama} ({user.no_hp})
            <span className="block text-[11px] text-slate-500">{user.detailInfo}</span>
          </div>

          <label className="block text-xs font-medium text-slate-400">Daftar Menu & Teks Pesan (Dapat Disesuaikan):</label>
          <textarea
            value={customMsg}
            onChange={(e) => onCustomMsgChange(e.target.value)}
            rows={10}
            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition leading-relaxed resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg bg-slate-800 transition"
          >
            Batal
          </button>
          <button
            onClick={onSend}
            disabled={isSending}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition disabled:opacity-50"
          >
            {isSending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Kirim Pesan Sapaan WA</span>
          </button>
        </div>
      </div>
    </div>
  );
}
