import React, { useState } from 'react';
import { 
  Key, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  MessageSquare 
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface ParentAccessData {
  isOpen: boolean;
  siswaName: string;
  parentName: string;
  parentPhone: string;
  token: string;
  loginLink: string;
  rawMessage: string;
  waSent: boolean;
  waError?: string;
}

interface ParentAccessModalProps {
  data: ParentAccessData | null;
  onClose: () => void;
}

export const ParentAccessModal: React.FC<ParentAccessModalProps> = ({ data, onClose }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!data?.isOpen) return null;

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      toast.success(`${fieldName} berhasil disalin!`);
      setTimeout(() => setCopiedField(null), 2500);
    }).catch(() => {
      toast.error(`Gagal menyalin ${fieldName}`);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden bg-slate-900 border border-slate-700/80 text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Link Akses Aplikasi Orang Tua</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {data.siswaName} • {data.parentName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* WA Gateway Status Banner */}
        <div className="mx-6 mb-4">
          {data.waSent ? (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300 font-medium">
                Terkirim otomatis via WA Gateway ke <span className="font-bold text-emerald-200">{data.parentPhone}</span>
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-2.5 bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-300 font-semibold">WA Gateway Offline — Salin & kirim manual via WA</p>
                {data.waError && (
                  <p className="text-[11px] text-amber-400/80 mt-0.5">{data.waError}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Body — Copy Fields */}
        <div className="px-6 pb-2 space-y-4">
          {/* Link Magic */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <ExternalLink size={12} className="text-indigo-400" /> Link Login Orang Tua (Tanpa Password)
            </label>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 min-w-0 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 truncate bg-slate-800/80 border border-slate-700/60 select-all cursor-text"
                title={data.loginLink}
              >
                {data.loginLink || '—'}
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(data.loginLink, 'Link')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 transition-all cursor-pointer"
                title="Salin Link"
              >
                {copiedField === 'Link' ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
              <a
                href={data.loginLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
                title="Buka Link di Tab Baru"
              >
                <ExternalLink size={15} />
              </a>
            </div>
          </div>

          {/* Pesan WA Siap Kirim */}
          {data.rawMessage && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <MessageSquare size={12} className="text-emerald-400" /> Pesan WhatsApp Siap Kirim
              </label>
              <div
                className="w-full rounded-xl p-3 text-xs text-slate-300 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto select-all cursor-text bg-slate-800/80 border border-slate-700/60 scrollbar-thin"
              >
                {data.rawMessage}
              </div>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(data.rawMessage, 'Pesan WA')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer active:scale-98 shadow-sm"
                >
                  {copiedField === 'Pesan WA' ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                  <span>{copiedField === 'Pesan WA' ? 'Tersalin!' : 'Salin Pesan WA'}</span>
                </button>
                {data.parentPhone && data.parentPhone !== '-' && (
                  <a
                    href={`https://wa.me/${data.parentPhone.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(data.rawMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-98 shadow-sm"
                  >
                    <ExternalLink size={14} />
                    <span>Kirim via WA Web</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
