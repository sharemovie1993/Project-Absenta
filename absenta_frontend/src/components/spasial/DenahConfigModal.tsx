import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  FileJson,
  Layers,
  Globe,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  UploadCloud,
  FileText,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  DenahSpasial,
  DenahElementNode,
  DenahMapGuideConfig,
} from '../../types/spasial.types';

export interface DenahConfigExportData {
  version: '1.0';
  app: 'Absenta.id Spasial Studio';
  exported_at: string;
  nama_denah: string;
  tipe?: string;
  lantai: number;
  gedung?: string | null;
  canvas_width: number;
  canvas_height: number;
  grid_size: number;
  map_guide_config?: DenahMapGuideConfig;
  total_elements: number;
  elements: DenahElementNode[];
}

interface DenahConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  denah: DenahSpasial;
  nodes: DenahElementNode[];
  mapGuideConfig?: DenahMapGuideConfig;
  isReadOnly?: boolean;
  onImportConfig?: (
    importedNodes: DenahElementNode[],
    importedMapConfig?: DenahMapGuideConfig
  ) => void;
}

export const DenahConfigModal: React.FC<DenahConfigModalProps> = ({
  isOpen,
  onClose,
  denah,
  nodes,
  mapGuideConfig,
  isReadOnly = false,
  onImportConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [hasCopied, setHasCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Import states
  const [importedJsonText, setImportedJsonText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [includeMapGuide, setIncludeMapGuide] = useState(true);
  const [importFileName, setImportFileName] = useState<string | null>(null);

  // Bersihkan elemen sistem internal sebelum diekspor
  const exportableNodes = useMemo(() => {
    return nodes.filter((n) => n.id !== '__MAP_GUIDE_CONFIG__');
  }, [nodes]);

  // Siapkan objek JSON konfigurasi yang terstandar
  const exportPayload: DenahConfigExportData = useMemo(() => {
    return {
      version: '1.0',
      app: 'Absenta.id Spasial Studio',
      exported_at: new Date().toISOString(),
      nama_denah: denah.nama_denah,
      tipe: denah.tipe,
      lantai: denah.lantai,
      gedung: denah.gedung || null,
      canvas_width: denah.canvas_width || 2400,
      canvas_height: denah.canvas_height || 1600,
      grid_size: denah.grid_size || 20,
      map_guide_config: mapGuideConfig,
      total_elements: exportableNodes.length,
      elements: exportableNodes,
    };
  }, [denah, exportableNodes, mapGuideConfig]);

  const jsonString = useMemo(() => {
    return JSON.stringify(exportPayload, null, 2);
  }, [exportPayload]);

  // Handler Download File .json
  const handleDownloadJson = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const safeName = (denah.nama_denah || 'denah')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      link.href = url;
      link.download = `absenta_denah_${safeName}_lt${denah.lantai}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Konfigurasi denah berhasil diunduh!');
    } catch (err: any) {
      toast.error('Gagal mengunduh berkas konfigurasi: ' + (err?.message || 'Error'));
    }
  };

  // Handler Salin ke Clipboard
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setHasCopied(true);
      toast.success('Konfigurasi JSON berhasil disalin ke clipboard!');
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      toast.error('Gagal menyalin ke clipboard. Silakan salin manual.');
    }
  };

  // Parsing & Validasi Data Impor
  const parsedImportData = useMemo<{
    isValid: boolean;
    error?: string;
    data?: DenahConfigExportData;
    elementCount: number;
    hasMapConfig: boolean;
  }>(() => {
    const raw = importedJsonText.trim();
    if (!raw) {
      return { isValid: false, elementCount: 0, hasMapConfig: false };
    }

    try {
      const parsed = JSON.parse(raw);

      // Dukungan fleksibel: format object standar atau array raw nodes langsung
      let elements: DenahElementNode[] = [];
      let mapConfig: DenahMapGuideConfig | undefined = undefined;

      if (Array.isArray(parsed)) {
        elements = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.elements)) {
          elements = parsed.elements;
        }
        if (parsed.map_guide_config && typeof parsed.map_guide_config === 'object') {
          mapConfig = parsed.map_guide_config;
        }
      } else {
        return {
          isValid: false,
          error: 'Format berkas tidak dikenali sebagai konfigurasi denah yang valid.',
          elementCount: 0,
          hasMapConfig: false,
        };
      }

      // Validasi struktur minimal nodes
      const validElements = elements.filter(
        (n) => n && typeof n === 'object' && typeof n.x === 'number' && typeof n.y === 'number'
      );

      if (validElements.length === 0 && !mapConfig) {
        return {
          isValid: false,
          error: 'Tidak ditemukan elemen ruangan atau koordinat yang valid dalam data JSON.',
          elementCount: 0,
          hasMapConfig: false,
        };
      }

      return {
        isValid: true,
        data: {
          version: '1.0',
          app: 'Absenta.id Spasial Studio',
          exported_at: parsed.exported_at || new Date().toISOString(),
          nama_denah: parsed.nama_denah || denah.nama_denah,
          tipe: parsed.tipe,
          lantai: parsed.lantai ?? denah.lantai,
          gedung: parsed.gedung,
          canvas_width: parsed.canvas_width || 2400,
          canvas_height: parsed.canvas_height || 1600,
          grid_size: parsed.grid_size || 20,
          map_guide_config: mapConfig,
          total_elements: validElements.length,
          elements: validElements,
        },
        elementCount: validElements.length,
        hasMapConfig: Boolean(mapConfig),
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: 'JSON tidak valid: ' + (err.message || 'Syntax error'),
        elementCount: 0,
        hasMapConfig: false,
      };
    }
  }, [importedJsonText, denah]);

  // Handler Upload Berkas File .json
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportedJsonText(content);
      }
    };
    reader.onerror = () => {
      toast.error('Gagal membaca berkas yang diunggah');
    };
    reader.readAsText(file);
  };

  // Handler Terapkan Konfigurasi Impor ke Kanvas
  const handleApplyImport = () => {
    if (!parsedImportData.isValid || !parsedImportData.data) {
      toast.error('Data konfigurasi belum valid untuk diterapkan.');
      return;
    }

    if (!onImportConfig) {
      toast.error('Fungsi impor tidak tersedia.');
      return;
    }

    const { elements: newElements, map_guide_config } = parsedImportData.data;

    let finalNodes: DenahElementNode[] = [];
    if (importMode === 'replace') {
      finalNodes = newElements;
    } else {
      // Merge: pastikan ID unik agar tidak bentrok
      const existingIds = new Set(nodes.map((n) => n.id));
      const adjustedNewElements = newElements.map((item) => {
        if (existingIds.has(item.id)) {
          return { ...item, id: `${item.id}-import-${Date.now()}` };
        }
        return item;
      });
      finalNodes = [...nodes.filter((n) => n.id !== '__MAP_GUIDE_CONFIG__'), ...adjustedNewElements];
    }

    const mapToApply = includeMapGuide && map_guide_config ? map_guide_config : undefined;

    onImportConfig(finalNodes, mapToApply);
    toast.success(
      `Berhasil mengimpor ${newElements.length} ruangan${
        mapToApply ? ' & peta satelit' : ''
      }! Klik [Simpan] pada toolbar untuk menyimpan permanen.`
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="denah-config-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header Modal */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 id="denah-config-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Konfigurasi Denah Spasial
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ekspor &amp; impor tata letak denah, ukuran kanvas, serta koordinat peta satelit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 bg-slate-50/30 dark:bg-slate-850/50">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Konfigurasi</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
              {exportableNodes.length} Elemen
            </span>
          </button>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'import'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Impor Konfigurasi</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300">
                Studio
              </span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'export' ? (
            <>
              {/* Ringkasan Konfigurasi Denah */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                      <Layers className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold">{denah.nama_denah}</h4>
                      <p className="text-[11px] text-slate-400">Lantai {denah.lantai}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {exportableNodes.length} Ruangan
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Resolusi Kanvas:</span>
                    <p className="font-semibold">{denah.canvas_width || 2400} × {denah.canvas_height || 1600} px</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Panduan Satelit:</span>
                    <p className="font-semibold flex items-center gap-1">
                      {mapGuideConfig?.enabled ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{mapGuideConfig.layer} (Zoom: {mapGuideConfig.zoom})</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Tidak aktif</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Unduh JSON & Salin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Berkas JSON (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-98 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Tersalin ke Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin Teks JSON</span>
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible Raw JSON Viewer */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowRawJson((prev) => !prev)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showRawJson ? 'Sembunyikan Cuplikan Raw JSON' : 'Pratinjau Raw JSON'}</span>
                </button>

                {showRawJson && (
                  <div className="mt-2 relative">
                    <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-[10.5px] font-mono overflow-auto max-h-56 leading-relaxed border border-slate-800">
                      {jsonString}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* TAB IMPOR KONFIGURASI */
            <>
              {/* File Upload Box */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-4 sm:p-6 text-center transition-colors bg-slate-50/50 dark:bg-slate-800/20">
                <input
                  type="file"
                  id="denah-json-upload"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="denah-json-upload"
                  className="flex flex-col items-center justify-center cursor-pointer gap-2"
                >
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {importFileName ? importFileName : 'Klik atau seret berkas .json ke sini'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Menerima berkas JSON ekspor studio denah Absenta
                    </p>
                  </div>
                </label>
              </div>

              {/* Atau Tempel Teks JSON */}
              <div className="space-y-1.5">
                <label
                  htmlFor="denah-json-textarea"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between"
                >
                  <span>Atau Tempel (Paste) Teks JSON Konfigurasi:</span>
                  {importedJsonText && (
                    <button
                      type="button"
                      onClick={() => {
                        setImportedJsonText('');
                        setImportFileName(null);
                      }}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  )}
                </label>
                <textarea
                  id="denah-json-textarea"
                  value={importedJsonText}
                  onChange={(e) => setImportedJsonText(e.target.value)}
                  placeholder="Tempel konfigurasi JSON di sini..."
                  rows={4}
                  className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Validasi */}
              {importedJsonText.trim() && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                    parsedImportData.isValid
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {parsedImportData.isValid ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  )}
                  <div>
                    {parsedImportData.isValid ? (
                      <>
                        <p className="font-bold">Konfigurasi Valid &amp; Siap Diterapkan</p>
                        <p className="text-[11px] opacity-90">
                          Terdeteksi {parsedImportData.elementCount} elemen ruangan
                          {parsedImportData.hasMapConfig ? ' dan konfigurasi peta satelit' : ''}.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold">Konfigurasi Tidak Valid</p>
                        <p className="text-[11px] opacity-90">{parsedImportData.error}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Opsi Mode Impor */}
              {parsedImportData.isValid && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Opsi Penerapan ke Kanvas:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold block">Ganti Denah (*Replace*)</span>
                        <span className="text-[10px] text-slate-400">Timpa seluruh elemen lama</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold block">Gabungkan (*Merge*)</span>
                        <span className="text-[10px] text-slate-400">Tambahkan ke elemen saat ini</span>
                      </div>
                    </label>
                  </div>

                  {parsedImportData.hasMapConfig && (
                    <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeMapGuide}
                        onChange={(e) => setIncludeMapGuide(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        Sinkronkan juga titik koordinat &amp; rotasi Peta Satelit / Google Maps
                      </span>
                    </label>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Modal */}
        <footer className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
          <p className="text-[11px] text-slate-400">
            {activeTab === 'export'
              ? 'Konfigurasi dapat diimpor kembali kapan saja di sekolah atau event lain.'
              : 'Pastikan untuk menekan [Simpan] pada toolbar setelah menerapkan impor.'}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Tutup
            </button>

            {activeTab === 'import' && (
              <button
                type="button"
                onClick={handleApplyImport}
                disabled={!parsedImportData.isValid}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Terapkan ke Kanvas</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DenahConfigModal;
