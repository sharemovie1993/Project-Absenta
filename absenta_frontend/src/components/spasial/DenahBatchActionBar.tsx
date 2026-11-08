import React, { useState } from 'react';
import {
  RotateCw,
  FlipHorizontal,
  Trash2,
  X,
  CheckSquare,
  Layers,
  Minimize2,
  Maximize2,
  Sliders,
  Save,
  Loader2,
} from 'lucide-react';

interface DenahBatchActionBarProps {
  selectedCount: number;
  totalCount: number;
  currentSize?: { width: number; height: number };
  onRotateAll: () => void;
  onFlipHAll: () => void;
  onDeleteAll: () => void;
  onDeselectAll: () => void;
  onSelectAll: () => void;
  onResizeStep: (deltaW: number, deltaH: number) => void;
  onSetSize: (width: number, height: number) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export const DenahBatchActionBar = React.memo<DenahBatchActionBarProps>(
  ({
    selectedCount,
    totalCount,
    currentSize,
    onRotateAll,
    onFlipHAll,
    onDeleteAll,
    onDeselectAll,
    onSelectAll,
    onResizeStep,
    onSetSize,
    onSave,
    isSaving = false,
  }) => {
  const [showPresets, setShowPresets] = useState(false);

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

      {/* Size Adjustment Controls (Perkecil / Perbesar / Presets) */}
      <div className="flex items-center gap-1 px-1.5 border-r border-slate-700 relative">
        <button
          type="button"
          onClick={() => onResizeStep(-20, -15)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
          title="Perkecil Ukuran Kotak (-20px × -15px)"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Perkecil</span>
        </button>

        {/* Current Size & Presets Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPresets((prev) => !prev)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
            title="Klik untuk memilih ukuran standar ruangan"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>{currentSize ? `${currentSize.width}×${currentSize.height}` : 'Ukuran'}</span>
          </button>

          {/* Preset Popup */}
          {showPresets && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5"
            >
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-800 mb-0.5">
                Preset Ukuran Kotak
              </div>
              <button
                type="button"
                onClick={() => {
                  onSetSize(100, 60);
                  setShowPresets(false);
                }}
                className="px-2.5 py-1 text-left text-xs font-medium hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Mini</span>
                <span className="font-mono text-[10px] text-slate-400">100 × 60</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetSize(130, 80);
                  setShowPresets(false);
                }}
                className="px-2.5 py-1 text-left text-xs font-medium hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Kompak</span>
                <span className="font-mono text-[10px] text-slate-400">130 × 80</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetSize(160, 100);
                  setShowPresets(false);
                }}
                className="px-2.5 py-1 text-left text-xs font-medium hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Standar</span>
                <span className="font-mono text-[10px] text-slate-400">160 × 100</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetSize(180, 110);
                  setShowPresets(false);
                }}
                className="px-2.5 py-1 text-left text-xs font-medium hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Lega</span>
                <span className="font-mono text-[10px] text-slate-400">180 × 110</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onResizeStep(20, 15)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-300 hover:text-emerald-200 border border-slate-700 hover:border-emerald-500/50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
          title="Perbesar Ukuran Kotak (+20px × +15px)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Perbesar</span>
        </button>
      </div>

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

      {/* Quick Save */}
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ml-1"
          title="Simpan Perubahan ke Database"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Simpan</span>
        </button>
      )}

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
});

DenahBatchActionBar.displayName = 'DenahBatchActionBar';
