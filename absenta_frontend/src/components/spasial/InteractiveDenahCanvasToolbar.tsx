import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Save,
  Printer,
  Undo2,
  Redo2,
  MapPin,
  Loader2,
  Wand2,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import type { DenahSpasial } from '../../types/spasial.types';

interface InteractiveDenahCanvasToolbarProps {
  denah: DenahSpasial;
  isLightMode: boolean;
  onToggleLightMode: () => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAutoLayout: () => void;
  isMapGuideOpen?: boolean;
  onToggleMapGuide?: () => void;
  onOpenPrint: () => void;
  onSave: () => void;
  isSaving: boolean;
  isReadOnly?: boolean;
}

export const InteractiveDenahCanvasToolbar: React.FC<InteractiveDenahCanvasToolbarProps> = ({
  denah,
  isLightMode,
  onToggleLightMode,
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAutoLayout,
  isMapGuideOpen = false,
  onToggleMapGuide,
  onOpenPrint,
  onSave,
  isSaving,
  isReadOnly = false,
}) => {
  return (
    <header
      className={`flex items-center justify-between px-4 py-2.5 border-b z-30 transition-colors ${
        isLightMode
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-slate-850 border-slate-750 text-slate-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <MapPin className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            {denah.nama_denah}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {denah.tipe === 'EVENT_UJIAN' ? 'Event CBT' : 'Sarpras Master'}
            </span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Lantai {denah.lantai} {denah.gedung ? `• Gedung ${denah.gedung}` : ''} • Grid Snap 20px
          </p>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center gap-1.5">
        {!isReadOnly && (
          <button
            type="button"
            onClick={onAutoLayout}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isLightMode
                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                : 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900 border-indigo-800'
            }`}
            title="Susun otomatis kotak ruangan dari data rombel & fasilitas"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Susun Otomatis</span>
          </button>
        )}

        {/* Satellite Map Guide Toggle */}
        {onToggleMapGuide && (
          <button
            type="button"
            onClick={onToggleMapGuide}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isMapGuideOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : isLightMode
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-750'
            }`}
            title="Panduan Peta Satelit / Google Maps untuk menyelaraskan pola denah"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Peta Satelit</span>
            {isMapGuideOpen && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onToggleLightMode}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isLightMode
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title={isLightMode ? 'Ganti ke Mode CAD Gelap' : 'Ganti ke Mode Blueprint Terang'}
        >
          {isLightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>

        {/* Zoom Controls */}
        <div
          className={`flex items-center rounded-lg p-0.5 border ${
            isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
          }`}
        >
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Perkecil (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono font-bold px-2 min-w-[45px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Perbesar (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Reset Tampilan"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Undo / Redo */}
        {!isReadOnly && (
          <div
            className={`flex items-center rounded-lg p-0.5 border ${
              isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Urungkan"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Ulangi"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Print Map Modal */}
        <button
          type="button"
          onClick={onOpenPrint}
          className={`px-3 py-1.5 text-xs font-bold border rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            isLightMode
              ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          Cetak Denah A4
        </button>

        {/* Save Button */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Simpan Denah
          </button>
        )}
      </div>
    </header>
  );
};
