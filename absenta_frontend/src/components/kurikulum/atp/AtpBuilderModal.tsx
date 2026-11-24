import React from 'react';
import { Modal } from '../../ui';
import { Layers } from 'lucide-react';
import { AtpBuilderView } from './AtpBuilderView';

export interface AtpBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMapelId?: string;
  initialFase?: string;
  zIndex?: number;
  onSaved?: () => void;
}

export const AtpBuilderModal: React.FC<AtpBuilderModalProps> = ({
  isOpen,
  onClose,
  initialMapelId,
  initialFase,
  zIndex = 170,
  onSaved,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      zIndex={zIndex}
      className="max-w-5xl w-full max-h-[92vh] flex flex-col rounded-3xl overflow-hidden"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-slate-800 dark:text-white text-sm sm:text-base">
              Penyusun ATP &amp; Tujuan Pembelajaran (TP)
            </span>
            <p className="text-[11px] text-slate-400 font-medium">
              Setelah disimpan, TP otomatis muncul di pilihan 1-Klik Form Jurnal KBM
            </p>
          </div>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-950/60">
        <AtpBuilderView
          embedded={true}
          initialMapelId={initialMapelId}
          initialFase={initialFase}
          onSaved={() => {
            if (onSaved) onSaved();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
};

export default AtpBuilderModal;
