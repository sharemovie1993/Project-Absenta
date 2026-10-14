import React from 'react';
import { Trash2, FileSpreadsheet, X, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui';

export interface MitraBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkExport: () => void;
  isDeleting?: boolean;
  canManage?: boolean;
}

export const MitraBulkActionBar: React.FC<MitraBulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkExport,
  isDeleting = false,
  canManage = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-30 mx-auto w-full max-w-3xl px-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md rounded-2xl shadow-xl border border-slate-700/60 dark:border-slate-800">
        {/* Left: Info & Deselect */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-indigo-600/30 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-indigo-300 font-bold text-xs">
            <CheckSquare size={15} className="text-indigo-400" />
            <span>{selectedCount} Mitra Terpilih</span>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors underline-offset-4 hover:underline cursor-pointer"
          >
            <X size={14} />
            Batal
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onBulkExport}
            className="h-8 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border-slate-600 flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>Ekspor Terpilih</span>
          </Button>

          {canManage && (
            <Button
              type="button"
              variant="toolbarDanger"
              size="toolbar"
              onClick={onBulkDelete}
              disabled={isDeleting}
              className="h-8 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 size={14} />
              <span>Hapus ({selectedCount})</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
