import React from 'react';
import { X } from 'lucide-react';
import {
  UnifiedKegiatanTerminalPanel,
  type UnifiedKegiatanTerminalPanelProps
} from './UnifiedKegiatanTerminalPanel';

interface UnifiedKegiatanRfidScanModalProps extends UnifiedKegiatanTerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnifiedKegiatanRfidScanModal: React.FC<UnifiedKegiatanRfidScanModalProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh] relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
          title="Tutup Modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto">
          <UnifiedKegiatanTerminalPanel {...props} />
        </div>
      </div>
    </div>
  );
};
