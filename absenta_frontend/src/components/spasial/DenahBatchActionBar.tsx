import React from 'react';
import { RotateCw, FlipHorizontal, Trash2, X, CheckSquare, Layers } from 'lucide-react';

interface DenahBatchActionBarProps {
  selectedCount: number;
  totalCount: number;
  onRotateAll: () => void;
  onFlipHAll: () => void;
  onDeleteAll: () => void;
  onDeselectAll: () => void;
  onSelectAll: () => void;
}

export const DenahBatchActionBar: React.FC<DenahBatchActionBarProps> = ({
  selectedCount,
  totalCount,
  onRotateAll,
  onFlipHAll,
  onDeleteAll,
  onDeselectAll,
  onSelectAll,
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Aksi Seleksi Massal"
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3.5 py-2 bg-slate-900/95 dark:bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
        <div className="p-1 bg-blue-600 rounded-lg text-white">
          <Layers className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-slate-100 font-mono whitespace-nowrap">
          {selectedCount} Terpilih
        </span>
      </div>

      {/* Select All if not all selected */}
      {selectedCount < totalCount && (
        <button
          type="button"
          onClick={onSelectAll}
          className="px-2 py-1 hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          title="Pilih Semua Ruangan (Ctrl+A)"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pilih Semua</span>
        </button>
      )}

      {/* Rotate all selected */}
      <button
        type="button"
        onClick={onRotateAll}
        className="px-2.5 py-1 hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
        title="Putar 90° Seluruh Ruangan Terpilih"
      >
        <RotateCw className="w-3.5 h-3.5 text-blue-400" />
        <span>Putar 90°</span>
      </button>

      {/* Flip H all selected */}
      <button
        type="button"
        onClick={onFlipHAll}
        className="px-2.5 py-1 hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
        title="Cermin Horizontal Seluruh Ruangan Terpilih"
      >
        <FlipHorizontal className="w-3.5 h-3.5 text-emerald-400" />
        <span>Cermin H</span>
      </button>

      {/* Delete all selected */}
      <button
        type="button"
        onClick={onDeleteAll}
        className="px-2.5 py-1 hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 border border-transparent hover:border-rose-800 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
        title="Hapus Seluruh Ruangan Terpilih"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        <span className="hidden sm:inline">Hapus</span>
      </button>

      {/* Cancel selection */}
      <button
        type="button"
        onClick={onDeselectAll}
        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer ml-1 transition-colors"
        title="Batalkan Seleksi (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
