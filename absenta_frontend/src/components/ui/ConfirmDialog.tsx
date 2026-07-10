import React from 'react';
import { AlertTriangle, Trash2, XCircle, CheckCircle, Info } from 'lucide-react';
import Modal, { ModalFooter } from './Modal';
import Button from './Button';
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

const iconByStyle: Record<ConfirmStyle, React.ReactNode> = {
  danger: <Trash2 className="w-6 h-6 text-red-600" />,
  warning: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
  info: <Info className="w-6 h-6 text-blue-600" />,
  success: <CheckCircle className="w-6 h-6 text-green-600" />,
  primary: <Info className="w-6 h-6 text-blue-600" />,
};

const headerClassByStyle: Record<ConfirmStyle, string> = {
  danger: 'bg-red-50 dark:bg-red-900/20',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20',
  info: 'bg-blue-50 dark:bg-blue-900/20',
  success: 'bg-green-50 dark:bg-green-900/20',
  primary: 'bg-blue-50 dark:bg-blue-900/20',
};

const progressColorByStyle: Record<ConfirmStyle, string> = {
  danger: 'from-red-500 via-rose-500 to-red-600',
  warning: 'from-yellow-500 via-amber-500 to-orange-500',
  info: 'from-blue-500 via-indigo-500 to-blue-600',
  success: 'from-green-500 via-emerald-500 to-green-600',
  primary: 'from-blue-500 via-indigo-500 to-blue-600',
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
  const isIndeterminate = loading && typeof progress === 'undefined';

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="md">
      <div className={cn('rounded-lg p-4 mb-4 flex items-start gap-3', headerClassByStyle[style])}>
        <div className="shrink-0">{iconByStyle[style]}</div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
      </div>

      {/* Progress Bar — muncul saat loading */}
      {loading && (
        <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Label */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              {progressLabel || 'Sedang memproses...'}
            </span>
            {hasProgress && (
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 tabular-nums">
                {Math.round(progress!)}%
              </span>
            )}
          </div>

          {/* Track */}
          <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            {hasProgress ? (
              /* Determinate */
              <div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out shadow-lg relative',
                  progressColorByStyle[style]
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress!))}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            ) : (
              /* Indeterminate */
              <div
                className={cn(
                  'h-full w-1/3 rounded-full bg-gradient-to-r shadow-lg',
                  progressColorByStyle[style],
                  'animate-[slide-right_1.2s_ease-in-out_infinite]'
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

      <ModalFooter>
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
          className="border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-9 text-xs px-4"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'text-white font-semibold rounded-xl h-9 text-xs px-5 shadow-sm transition-all',
            style === 'danger' && 'bg-red-600 hover:bg-red-700',
            style === 'warning' && 'bg-amber-500 hover:bg-amber-600',
            style === 'info' && 'bg-blue-600 hover:bg-blue-700',
            style === 'success' && 'bg-green-600 hover:bg-green-700',
            style === 'primary' && 'bg-blue-600 hover:bg-blue-700',
            loading ? 'opacity-70 pointer-events-none' : ''
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Memproses...
            </span>
          ) : confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
