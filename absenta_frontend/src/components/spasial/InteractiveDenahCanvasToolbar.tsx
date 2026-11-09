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
  FileJson,
  Eye,
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
  onSetZoomScale?: (scale: number) => void;
  onFitToScreen?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAutoLayout: () => void;
  isMapGuideOpen?: boolean;
  onToggleMapGuide?: () => void;
  isBoxTransparent?: boolean;
  onToggleBoxTransparent?: () => void;
  onOpenPrint: () => void;
  onOpenConfig?: () => void;
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
  onSetZoomScale,
  onFitToScreen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAutoLayout,
  isMapGuideOpen = false,
  onToggleMapGuide,
  isBoxTransparent = false,
  onToggleBoxTransparent,
  onOpenPrint,
  onOpenConfig,
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
      <div className="flex items-center gap-2 shrink-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isSidebarOpen
                ? 'bg-slate-100 dark:bg-slate-750 text-indigo-600 dark:text-indigo-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                : 'bg-indigo-600 text-white border-indigo-700 shadow-xs hover:bg-indigo-700'
            }`}
            title={isSidebarOpen ? 'Ciutkan Direktori Ruangan (Maksimalkan Peta)' : 'Buka Direktori Ruangan'}
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
            className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer max-w-[130px] sm:max-w-none truncate"
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
              <span className="truncate max-w-[120px] sm:max-w-none">{denah.nama_denah}</span>
              <span className="text-[11px] text-slate-400 font-normal hidden xs:inline">
                • Lantai {denah.lantai}
              </span>
            </h2>
          </div>
        )}

        {!isReadOnly && onCreateNewDenah && (
          <button
            type="button"
            onClick={onCreateNewDenah}
            className="p-1 px-2 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            title="Buat Denah Baru"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Baru</span>
          </button>
        )}
      </div>

      {/* Sisi Kanan: Tools Studio (scrollable) + Pinned Simpan & Tutup */}
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {!isReadOnly && (
            <button
              type="button"
              onClick={onAutoLayout}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border shrink-0 ${
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

          {/* Satellite Map Guide Toggle (Editor Only) */}
          {!isReadOnly && onToggleMapGuide && (
            <button
              type="button"
              onClick={onToggleMapGuide}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border shrink-0 ${
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

          {/* Quick Toggle: Kotak Kaca Transparan / Solid (Editor Only) */}
          {!isReadOnly && onToggleBoxTransparent && (
            <button
              type="button"
              onClick={onToggleBoxTransparent}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border shrink-0 ${
                isBoxTransparent
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                  : isLightMode
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-750'
              }`}
              title={
                isBoxTransparent
                  ? 'Mode Kaca Transparan Aktif (Peta terlihat tembus pandang). Klik untuk beralih ke mode solid pekat.'
                  : 'Mode Solid Aktif. Klik untuk beralih ke mode kaca transparan agar kanvas peta satelit tidak terblokir.'
              }
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBoxTransparent ? 'Kotak Transparan' : 'Kotak Solid'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleLightMode}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
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
            className={`flex items-center rounded-lg p-0.5 border shrink-0 ${
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
            <select
              value={(() => {
                const rounded = Math.round(scale * 100);
                if ([50, 60, 75, 100, 125, 150].includes(rounded)) return rounded.toString();
                return 'custom';
              })()}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'fit') {
                  if (onFitToScreen) onFitToScreen();
                  else onResetZoom();
                } else if (val !== 'custom') {
                  if (onSetZoomScale) onSetZoomScale(parseInt(val, 10) / 100);
                }
              }}
              className="text-[11px] font-mono font-bold px-1 py-0.5 bg-transparent border-0 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden text-center"
              title="Preset Zoom / Pas Layar"
            >
              <option value="fit" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                Pas Layar
              </option>
              <option value="50" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">50%</option>
              <option value="60" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">60%</option>
              <option value="75" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">75%</option>
              <option value="100" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">100%</option>
              <option value="125" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">125%</option>
              <option value="150" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">150%</option>
              {![50, 60, 75, 100, 125, 150].includes(Math.round(scale * 100)) && (
                <option value="custom" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                  {Math.round(scale * 100)}%
                </option>
              )}
            </select>
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
              onClick={onFitToScreen || onResetZoom}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Pas Layar (Fit to Screen)"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Undo / Redo */}
          {!isReadOnly && (
            <div
              className={`flex items-center rounded-lg p-0.5 border shrink-0 ${
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

          {/* Print Map Modal (Editor Only) */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={onOpenPrint}
              className={`px-2.5 py-1.5 text-xs font-bold border rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isLightMode
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
              title="Pratinjau Cetak & Unduh PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak A4</span>
            </button>
          )}

          {/* Konfigurasi Denah (Ekspor & Impor JSON - Editor Only) */}
          {!isReadOnly && onOpenConfig && (
            <button
              type="button"
              onClick={onOpenConfig}
              className={`px-2.5 py-1.5 text-xs font-bold border rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isLightMode
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-800'
              }`}
              title="Ekspor & Impor Konfigurasi Denah (JSON)"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Ekspor &amp; Impor</span>
            </button>
          )}
        </div>

        {/* Pinned Action Group: Simpan & Tutup (Always Visible & Never Clipped) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-1 border-l border-slate-200 dark:border-slate-750">
          {!isReadOnly && (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
              title="Simpan Denah Spasial ke Database"
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
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-0.5 shrink-0"
              title="Tutup Studio Denah"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
