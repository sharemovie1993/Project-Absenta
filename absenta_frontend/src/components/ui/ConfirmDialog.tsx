import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Info, Sparkles, ShieldAlert } from 'lucide-react';
import Modal from './Modal';
import { cn } from '@/lib/utils';

type ConfirmStyle = 'danger' | 'warning' | 'info' | 'success' | 'primary';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  style?: ConfirmStyle;
  loading?: boolean;
  /** Progress value 0-100. When provided and loading=true, shows a progress bar instead of spinner text */
  progress?: number;
  /** Label shown above the progress bar */
  progressLabel?: string;
}

const iconBadgeClassByStyle: Record<ConfirmStyle, string> = {
  danger: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-950/30',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 ring-4 ring-amber-50 dark:ring-amber-950/30',
  info: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 ring-4 ring-blue-50 dark:ring-blue-950/30',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 ring-4 ring-emerald-50 dark:ring-emerald-950/30',
  primary: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-950/30',
};

const confirmBtnClassByStyle: Record<ConfirmStyle, string> = {
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-500/20',
  info: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20',
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20',
};

const progressColorByStyle: Record<ConfirmStyle, string> = {
  danger: 'from-rose-500 via-red-500 to-rose-600',
  warning: 'from-amber-500 via-orange-500 to-amber-600',
  info: 'from-blue-500 via-indigo-500 to-blue-600',
  success: 'from-emerald-500 via-teal-500 to-emerald-600',
  primary: 'from-indigo-500 via-purple-500 to-indigo-600',
};

export default function ConfirmDialog({
  isOpen,
  title = 'Konfirmasi Aksi',
  description = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  style = 'danger',
  loading = false,
  progress,
  progressLabel,
}: ConfirmDialogProps) {
  const hasProgress = loading && typeof progress === 'number';

  // Hanya tampilkan ikon tong sampah jika aksi benar-benar penghapusan (Hapus / Delete)
  const combinedLabel = `${typeof title === 'string' ? title : ''} ${confirmText || ''}`.toLowerCase();
  const isDeleteAction =
    combinedLabel.includes('hapus') ||
    combinedLabel.includes('delete') ||
    combinedLabel.includes('buang') ||
    combinedLabel.includes('kosongkan');

  const renderIcon = () => {
    if (style === 'danger') {
      return isDeleteAction ? <Trash2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />;
    }
    if (style === 'warning') return <AlertTriangle className="w-5 h-5" />;
    if (style === 'info') return <Info className="w-5 h-5" />;
    if (style === 'success') return <CheckCircle2 className="w-5 h-5" />;
    return <Sparkles className="w-5 h-5" />;
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <div className="space-y-4 pt-1">
        {/* Header Icon + Title + Description */}
        <div className="flex items-start gap-3.5 pr-6">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
              iconBadgeClassByStyle[style]
            )}
          >
            {renderIcon()}
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
              {title}
            </h3>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {description}
            </div>
          </div>
        </div>

        {/* Progress Bar — muncul saat loading */}
        {loading && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                {progressLabel || 'Sedang memproses...'}
              </span>
              {hasProgress && (
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 tabular-nums">
                  {Math.round(progress!)}%
                </span>
              )}
            </div>

            <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              {hasProgress ? (
                <div
                  className={cn(
                    'h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out',
                    progressColorByStyle[style]
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, progress!))}%` }}
                />
              ) : (
                <div
                  className={cn(
                    'h-full w-1/3 rounded-full bg-gradient-to-r',
                    progressColorByStyle[style]
                  )}
                  style={{
                    animation: 'indeterminate-progress 1.4s ease-in-out infinite',
                  }}
                />
              )}
            </div>

            <style>{`
              @keyframes indeterminate-progress {
                0%   { transform: translateX(-100%) scaleX(0.5); }
                50%  { transform: translateX(133%) scaleX(1); }
                100% { transform: translateX(300%) scaleX(0.5); }
              }
            `}</style>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2',
              confirmBtnClassByStyle[style]
            )}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Memproses...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
