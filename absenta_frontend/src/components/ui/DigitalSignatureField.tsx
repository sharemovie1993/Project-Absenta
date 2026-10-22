import React, { useState } from 'react';
import { PenTool, CheckCircle2, Trash2, Edit3 } from 'lucide-react';
import { DigitalSignaturePadModal } from './DigitalSignaturePadModal';
import { cn } from '@/lib/utils';

export interface DigitalSignatureFieldProps {
  label: string;
  penName?: string;
  value?: string | null;
  onChange: (base64: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export const DigitalSignatureField: React.FC<DigitalSignatureFieldProps> = ({
  label,
  penName,
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-foreground flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-primary" />
          {label}
        </label>
        {value && !disabled && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              Ganti TTD
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[11px] text-rose-500 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Hapus
            </button>
          </div>
        )}
      </div>

      {value ? (
        <div
          onClick={() => !disabled && setModalOpen(true)}
          className={cn(
            'relative h-20 border rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center p-2 group transition-all',
            disabled ? 'cursor-default' : 'cursor-pointer hover:border-primary/50'
          )}
        >
          <img src={value} alt="Tanda Tangan Digital" className="max-h-16 object-contain" />
          <div className="absolute top-1.5 right-1.5">
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              TTD Sah
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setModalOpen(true)}
          className={cn(
            'w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all',
            disabled
              ? 'opacity-50 cursor-not-allowed bg-muted/20 border-muted'
              : 'border-slate-300 dark:border-slate-700 hover:border-primary/60 hover:bg-primary/5 cursor-pointer bg-muted/10'
          )}
        >
          <PenTool className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Buka Pen Tanda Tangan Digital</span>
          <span className="text-[10px] text-muted-foreground">Sentuh / Goreskan TTD dengan Pen</span>
        </button>
      )}

      <DigitalSignaturePadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(sig) => onChange(sig)}
        title={`Tanda Tangan: ${label}`}
        penName={penName || label}
      />
    </div>
  );
};
