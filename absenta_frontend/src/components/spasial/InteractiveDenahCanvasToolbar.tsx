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
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  X,
} from 'lucide-react';
import type { DenahSpasial } from '../../types/spasial.types';

interface InteractiveDenahCanvasToolbarProps {
  denah: DenahSpasial;
  denahList?: DenahSpasial[];
  onSelectDenah?: (denah: DenahSpasial) => void;
  onCreateNewDenah?: () => void;
  onClose?: () => void;
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
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const InteractiveDenahCanvasToolbar: React.FC<InteractiveDenahCanvasToolbarProps> = ({
  denah,
  denahList,
  onSelectDenah,
  onCreateNewDenah,
  onClose,
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
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  return (
    <header
      className={`flex items-center justify-between px-3 sm:px-4 py-2 border-b z-30 transition-colors shrink-0 ${
        isLightMode
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-slate-850 border-slate-750 text-slate-200'
      }`}
    >
      {/* Sisi Kiri: Toggle Panel + Identitas Denah + Switcher */}
      <div className="flex items-center gap-2">
        {!isReadOnly && onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isSidebarOpen
                ? 'bg-slate-100 dark:bg-slate-750 text-indigo-600 dark:text-indigo-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                : 'bg-indigo-600 text-white border-indigo-700 shadow-xs hover:bg-indigo-700'
            }`}
            title={isSidebarOpen ? 'Ciutkan Panel Kiri (Maksimalkan Kanvas)' : 'Buka Panel Kiri'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        )}

        {denahList && denahList.length > 1 && onSelectDenah ? (
          <select
            value={denah.id}
            onChange={(e) => {
              const sel = denahList.find((d) => d.id === e.target.value);
              if (sel) onSelectDenah(sel);
            }}
            className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            {denahList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama_denah} • Lt {d.lantai}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="p-1 bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 rounded-md">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-xs sm:text-sm font-bold flex items-center gap-1">
              <span>{denah.nama_denah}</span>
              <span className="text-[11px] text-slate-400 font-normal">
                • Lantai {denah.lantai}
              </span>
            </h2>
          </div>
        )}

        {onCreateNewDenah && (
          <button
            type="button"
            onClick={onCreateNewDenah}
            className="p-1 px-2 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            title="Buat Denah Baru"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Baru</span>
          </button>
        )}
      </div>

      {/* Sisi Tengah/Kanan: Toolbar Kontrol Studio */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {!isReadOnly && (
          <button
            type="button"
            onClick={onAutoLayout}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isLightMode
                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                : 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900 border-indigo-800'
            }`}
            title="Susun otomatis kotak ruangan dari data rombel"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Susun Otomatis</span>
          </button>
        )}

        {/* Satellite Map Guide Toggle */}
        {onToggleMapGuide && (
          <button
            type="button"
            onClick={onToggleMapGuide}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isMapGuideOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : isLightMode
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-750'
            }`}
            title="Panduan Peta Satelit / Google Maps"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Peta Satelit</span>
            {isMapGuideOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
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
          title={isLightMode ? 'Mode Gelap' : 'Mode Terang'}
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
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Perkecil (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-bold px-1.5 min-w-[38px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Perbesar (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Reset Skala"
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
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Urungkan"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
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
          className={`px-2.5 py-1.5 text-xs font-bold border rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            isLightMode
              ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
          }`}
          title="Pratinjau Cetak & Unduh PDF"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cetak A4</span>
        </button>

        {/* Save Button */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Simpan</span>
          </button>
        )}

        {/* Close Button if Modal */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-0.5"
            title="Tutup Studio Denah"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
