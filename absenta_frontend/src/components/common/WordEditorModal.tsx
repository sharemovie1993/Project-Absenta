/**
 * WordEditorModal — Shared rich-text Word-style continuous document editor.
 * Mode Single Continuous Document (Persis Microsoft Word) dengan Toolbar Ultra-Compact.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import {
  Printer, Save, Maximize2, Minimize2, Settings2,
} from 'lucide-react';
import { Modal, Button } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { getTenantById } from '../../api/tenants.api';
import { sekolahApi } from '../../api/academic/sekolah.api';

export interface WordEditorPage {
  label: string;
  html: string;
}

export interface WordEditorConfig {
  margin?: MarginConfig;
  paperKey?: string;
  orientation?: 'portrait' | 'landscape';
}

export interface WordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  printTitle?: string;
  initialPages?: WordEditorPage[];
  initialConfig?: WordEditorConfig;
  allowExtraPages?: boolean;
  printButtonLabel?: string;
  orientation?: 'portrait' | 'landscape';
  onBeforePrint?: (pages: WordEditorPage[]) => void;
  onSave?: (pages: WordEditorPage[], config?: WordEditorConfig) => Promise<void> | void;
  saveButtonLabel?: string;
  extraToolbarItems?: React.ReactNode;
  readOnly?: boolean;
}

interface PaperSize {
  label: string;
  widthMm: number;
  heightMm: number;
}

const PAPER_SIZES: Record<string, PaperSize> = {
  'A4':     { label: 'A4 (210 × 297 mm)',       widthMm: 210, heightMm: 297 },
  'F4':     { label: 'F4 / Folio (215 × 330 mm)', widthMm: 215, heightMm: 330 },
  'A3':     { label: 'A3 (297 × 420 mm)',       widthMm: 297, heightMm: 420 },
  'Letter': { label: 'Letter (216 × 279 mm)',   widthMm: 216, heightMm: 279 },
};

interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const DEFAULT_MARGIN: MarginConfig = { top: 20, right: 25, bottom: 20, left: 25 };

import { renderToString } from 'react-dom/server';
import { PrintHeader } from '../ui/PrintHeader';

// Kop Builder (Official Absenta PrintHeader 1:1 Tenant Rule - Protected Non-editable)
const buildKopHtml = (tenantInfo: any, includeLogoKanan: boolean = true): string => {
  if (!tenantInfo) return '';
  const activeTenantInfo = includeLogoKanan
    ? tenantInfo
    : { ...tenantInfo, logo_url: null, logo_sekunder_url: null, logo_kanan_url: null };
  const headerHtml = renderToString(<PrintHeader variant="portrait" tenantInfo={activeTenantInfo} />);
  return `<div id="kop-surat-shared" contenteditable="false" style="width:100%;margin-bottom:12px;user-select:none;">
  ${headerHtml}
</div>`;
};

// Merge multi-pages array into single continuous HTML with Page Breaks
const combinePagesToSingleHtml = (pagesList: WordEditorPage[]): string => {
  if (!pagesList || pagesList.length === 0) return '<p>Mulai mengetik...</p>';
  return pagesList
    .map((p) => p.html)
    .join('<p style="page-break-before: always;"><!-- pagebreak --></p>');
};

export const WordEditorModal: React.FC<WordEditorModalProps> = ({
  isOpen,
  onClose,
  title = 'Word Editor',
  printTitle = 'Dokumen',
  initialPages = [{ label: 'Halaman 1', html: '<p>Mulai mengetik di sini...</p>' }],
  initialConfig,
  printButtonLabel = 'Cetak / Ekspor PDF',
  orientation: initialOrientation = 'portrait',
  onBeforePrint,
  onSave,
  saveButtonLabel = 'Simpan Template Master',
  extraToolbarItems,
  readOnly = false,
}) => {
  const { user } = useAuth();
  const editorRef = useRef<any>(null);

  const [documentHtml,        setDocumentHtml]        = useState<string>('');
  const [orientation,         setOrientation]         = useState(initialOrientation);
  const [isFullScreen,        setIsFullScreen]        = useState(false);
  const [showMarginPopover,   setShowMarginPopover]   = useState(false);

  // Paper & Margin
  const [paperKey,            setPaperKey]            = useState<string>('A4');
  const [margin,              setMargin]              = useState<MarginConfig>(DEFAULT_MARGIN);

  // Kop state
  const [tenantInfo,       setTenantInfo]       = useState<any>(null);
  const [kopActive,        setKopActive]        = useState(false);
  const [includeLogoKanan, setIncludeLogoKanan] = useState(true);

  const paper = PAPER_SIZES[paperKey] || PAPER_SIZES['A4'];

  // Fetch tenant & sekolah config
  useEffect(() => {
    if (!isOpen) return;
    if (user?.tenant_id) {
      getTenantById(user.tenant_id)
        .then((res) => {
          if (res?.data) {
            setTenantInfo((prev: any) => ({ ...prev, ...res.data }));
          }
        })
        .catch(() => {});
    }
    sekolahApi.getProfile()
      .then((res: any) => {
        if (res?.data) {
          setTenantInfo((prev: any) => ({ ...res.data, ...prev }));
        }
      })
      .catch(() => {});
  }, [isOpen, user?.tenant_id]);

  const prevOpenRef = useRef(false);

  // Sync content & config when modal opens OR when initialPages finishes loading asynchronously
  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      return;
    }

    const isFirstOpen = !prevOpenRef.current;
    if (isFirstOpen || (initialPages && initialPages.length > 0)) {
      const mergedHtml = combinePagesToSingleHtml(initialPages);
      setDocumentHtml(mergedHtml);
      setKopActive(mergedHtml.includes('id="kop-surat-shared"'));

      if (isFirstOpen) {
        const activeMargin = initialConfig?.margin || DEFAULT_MARGIN;
        setMargin(activeMargin);
        setPaperKey(initialConfig?.paperKey || 'A4');
        setOrientation(initialConfig?.orientation || initialOrientation);
      }

      if (editorRef.current) {
        editorRef.current.setContent(mergedHtml);
        const activeMargin = initialConfig?.margin || margin;
        const body = editorRef.current.getBody();
        if (body) {
          body.style.padding = `${activeMargin.top}mm ${activeMargin.right}mm ${activeMargin.bottom}mm ${activeMargin.left}mm`;
        }
      }
    }
    prevOpenRef.current = true;
  }, [isOpen, initialPages, initialConfig]);

  // Toggle Kop Surat
  const handleToggleKop = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.getContent();
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const existing = doc.querySelector('#kop-surat-shared');

    if (existing) {
      existing.remove();
      setKopActive(false);
    } else {
      const kopHtml = buildKopHtml(tenantInfo, includeLogoKanan);
      doc.body.insertAdjacentHTML('afterbegin', kopHtml);
      setKopActive(true);
    }
    const updated = doc.body.innerHTML;
    editorRef.current.setContent(updated);
    setDocumentHtml(updated);
  };

  const handleLogoKananChange = (checked: boolean) => {
    setIncludeLogoKanan(checked);
    if (!editorRef.current || !kopActive) return;
    const content = editorRef.current.getContent();
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const existing = doc.querySelector('#kop-surat-shared');
    if (!existing) return;

    existing.outerHTML = buildKopHtml(tenantInfo, checked);
    const updated = doc.body.innerHTML;
    editorRef.current.setContent(updated);
    setDocumentHtml(updated);
  };

  // Helper to split documentHtml back to array if onSave expects array
  const getPagesArray = (): WordEditorPage[] => {
    const html = editorRef.current ? editorRef.current.getContent() : documentHtml;
    // Split by pagebreak if present
    const parts = html.split(/(?:<p[^>]*>\s*<!--\s*pagebreak\s*-->\s*<\/p>|<div[^>]*style="[^"]*page-break-after:[^"]*"[^>]*>.*?<\/div>)/gi).filter(Boolean);
    if (parts.length <= 1) {
      return [{ label: 'Dokumen', html }];
    }
    return parts.map((part: string, idx: number) => ({
      label: `Halaman ${idx + 1}`,
      html: part.trim(),
    }));
  };

  // Print / Export PDF
  const handlePrint = () => {
    const pagesArray = getPagesArray();
    if (onBeforePrint) onBeforePrint(pagesArray);

    const printWin = window.open('', '_blank');
    if (!printWin) { alert('Pop-up diblokir. Izinkan pop-up untuk mencetak.'); return; }

    const pw = orientation === 'landscape' ? paper.heightMm : paper.widthMm;
    const ph = orientation === 'landscape' ? paper.widthMm : paper.heightMm;
    const pageSize = `${pw}mm ${ph}mm`;
    const pad = `${margin.top}mm ${margin.right}mm ${margin.bottom}mm ${margin.left}mm`;

    const pagesHtml = pagesArray
      .map((p) => `<div style="page-break-after:always;width:${pw}mm;min-height:${ph}mm;padding:${pad};background:white;margin:0 auto;">${p.html}</div>`)
      .join('');

    printWin.document.write(`<!DOCTYPE html><html><head>
      <title>${printTitle}</title>
      <style>
        @page{size:${pageSize};margin:0;}
        body{margin:0;padding:0;background:#fff;}
        *{box-sizing:border-box;}
        @media print{
          body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        }
      </style>
    </head><body>
      ${pagesHtml}
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    printWin.document.close();
  };

  const handleSaveTrigger = () => {
    const pagesArray = getPagesArray();
    if (onSave) onSave(pagesArray, { margin, paperKey, orientation });
  };

  const updateMargin = (newMargin: MarginConfig) => {
    setMargin(newMargin);
    if (editorRef.current) {
      const body = editorRef.current.getBody();
      if (body) {
        body.style.padding = `${newMargin.top}mm ${newMargin.right}mm ${newMargin.bottom}mm ${newMargin.left}mm`;
      }
    }
  };

  const canvasW = orientation === 'landscape' ? paper.heightMm : paper.widthMm;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="full">
      <div className={`flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden transition-all duration-200 ${isFullScreen ? 'h-[96vh]' : 'h-[90vh]'}`}>
        
        {/* ULTRA-COMPACT SINGLE RIBBON TOOLBAR (Gaya Microsoft Word Modern) */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs shrink-0 text-xs">
          
          {/* Left Group: Paper Size & Margin */}
          <div className="flex items-center gap-2 flex-wrap">
            {readOnly ? (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 font-extrabold shadow-2xs">
                  👁️ Pratinjau Dokumen (Read-Only)
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                  Kertas: {paper.label} ({orientation.toUpperCase()})
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                  Margin: {margin.top}/{margin.right}/{margin.bottom}/{margin.left}mm
                </span>
              </div>
            ) : (
              <>
                <select
                  value={paperKey}
                  onChange={(e) => setPaperKey(e.target.value)}
                  className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 shadow-2xs focus:outline-none"
                >
                  {Object.entries(PAPER_SIZES).map(([k, p]) => (
                    <option key={k} value={k}>{p.label}</option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'))}
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 py-0.5 px-2"
                >
                  {orientation === 'portrait' ? 'PORTRAIT' : 'LANDSCAPE'}
                </Button>

                {/* Popover Setting Margin */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMarginPopover((v) => !v)}
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 flex items-center gap-1 py-0.5 px-2"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Margin ({margin.top}/{margin.right}/{margin.bottom}/{margin.left}mm)</span>
                  </Button>

                  {showMarginPopover && (
                    <div className="absolute left-0 top-full mt-1.5 w-64 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 text-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">Pengaturan Margin</span>
                        <button
                          type="button"
                          onClick={() => setShowMarginPopover(false)}
                          className="text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Preset Buttons */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Preset</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateMargin({ top: 25, right: 25, bottom: 25, left: 25 })}
                            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-left font-semibold text-[11px]"
                          >
                            Standard (25mm)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMargin({ top: 12, right: 12, bottom: 12, left: 12 })}
                            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-left font-semibold text-[11px]"
                          >
                            Sempit (12mm)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMargin({ top: 19, right: 19, bottom: 19, left: 19 })}
                            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-left font-semibold text-[11px]"
                          >
                            Sedang (19mm)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMargin({ top: 38, right: 38, bottom: 38, left: 38 })}
                            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-left font-semibold text-[11px]"
                          >
                            Lebar (38mm)
                          </button>
                        </div>
                      </div>

                      {/* Custom Input */}
                      <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Kustom (mm)</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          <label className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-500">Atas</span>
                            <input
                              type="number" min={0} max={60}
                              value={margin.top}
                              onChange={(e) => updateMargin({ ...margin, top: Number(e.target.value) })}
                              className="w-full text-center border border-slate-200 dark:border-slate-700 rounded py-0.5 font-bold text-xs"
                            />
                          </label>
                          <label className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-500">Kanan</span>
                            <input
                              type="number" min={0} max={60}
                              value={margin.right}
                              onChange={(e) => updateMargin({ ...margin, right: Number(e.target.value) })}
                              className="w-full text-center border border-slate-200 dark:border-slate-700 rounded py-0.5 font-bold text-xs"
                            />
                          </label>
                          <label className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-500">Bawah</span>
                            <input
                              type="number" min={0} max={60}
                              value={margin.bottom}
                              onChange={(e) => updateMargin({ ...margin, bottom: Number(e.target.value) })}
                              className="w-full text-center border border-slate-200 dark:border-slate-700 rounded py-0.5 font-bold text-xs"
                            />
                          </label>
                          <label className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-500">Kiri</span>
                            <input
                              type="number" min={0} max={60}
                              value={margin.left}
                              onChange={(e) => updateMargin({ ...margin, left: Number(e.target.value) })}
                              className="w-full text-center border border-slate-200 dark:border-slate-700 rounded py-0.5 font-bold text-xs"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleKop}
                  className={`text-xs font-bold py-0.5 px-2 ${
                    kopActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'text-slate-600 border-slate-200'
                  }`}
                >
                  🏛️ {kopActive ? 'KOP AKTIF' : 'TAMBAH KOP SURAT'}
                </Button>

                {kopActive && (
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLogoKanan}
                      onChange={(e) => handleLogoKananChange(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                    />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Logo Kanan
                    </span>
                  </label>
                )}

                {/* Mail Merge Dropdown */}
                {extraToolbarItems && (
                  <>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="flex items-center gap-1.5">
                      {extraToolbarItems}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right Group: Fullscreen, Simpan, Cetak */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullScreen((v) => !v)}
              title={isFullScreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Fullscreen)'}
              className="text-xs font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 py-1"
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Kecilkan</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen</span>
                </>
              )}
            </Button>

            {onSave && (
              <Button
                size="sm"
                onClick={handleSaveTrigger}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold shadow-sm flex items-center gap-1.5 py-1"
              >
                <Save className="w-4 h-4" />
                {saveButtonLabel}
              </Button>
            )}

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-sm flex items-center gap-1.5 py-1"
            >
              <Printer className="w-4 h-4" />
              {printButtonLabel}
            </Button>
          </div>
        </div>

        {/* TinyMCE Single Continuous Document Editor Canvas (Persis Microsoft Word) */}
        <div className="flex-1 h-full overflow-hidden p-0 bg-slate-300/60 dark:bg-slate-950">
          <Editor
            tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
            onInit={(evt, editor) => {
              editorRef.current = editor;
              if (editor) {
                const body = editor.getBody();
                if (body) {
                  body.style.padding = `${margin.top}mm ${margin.right}mm ${margin.bottom}mm ${margin.left}mm`;
                }
              }
            }}
            value={documentHtml}
            onEditorChange={(content) => setDocumentHtml(content)}
            init={{
              height: '100%',
              readonly: readOnly,
              promotion: false,
              branding: false,
              resize: false,
              statusbar: !readOnly,
              menubar: false, // Menyembunyikan menubar File Edit View Insert yang redundant
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount', 'pagebreak', 'noneditable'
              ],
              noneditable_class: 'mceNonEditable',
              toolbar: readOnly ? false : 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough forecolor backcolor | alignleft aligncenter alignright alignjustify | numlist bullist outdent indent | table tableprops tablerowprops tablecellprops | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablecellbackgroundcolor tablecellbordercolor | removeformat | pagebreak fullscreen code',
              content_style: `
                html {
                  background-color: #cbd5e1;
                  padding: 24px 0;
                  min-height: 100%;
                }
                body {
                  width: ${canvasW}mm;
                  min-height: ${paper.heightMm}mm;
                  font-family: 'Book Antiqua', 'Bookman Old Style', 'Palatino Linotype', serif;
                  font-size: 11pt;
                  line-height: 14.9pt;
                  color: #000;
                  padding: ${margin.top}mm ${margin.right}mm ${margin.bottom}mm ${margin.left}mm;
                  margin: 0 auto;
                  background: #ffffff;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.18);
                  border-radius: 2px;
                  box-sizing: border-box;
                }
                .mceNonEditable {
                  user-select: none;
                  cursor: default;
                }
                .placeholder-pill {
                  user-select: none;
                  background-color: #e0f2fe;
                  color: #0369a1;
                  border: 1px solid #7dd3fc;
                  border-radius: 4px;
                  padding: 1px 6px;
                  font-weight: bold;
                  font-family: sans-serif;
                  font-size: 10pt;
                  display: inline-block;
                  margin: 0 2px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 12pt 0;
                }
                th, td {
                  border: 1pt solid #000;
                  padding: 4pt 6pt;
                }
                th {
                  background-color: #f8fafc;
                  font-weight: bold;
                }
                #kop-surat-shared img {
                  max-height: 85px !important;
                  max-width: 120px !important;
                  height: auto !important;
                  width: auto !important;
                  object-fit: contain !important;
                  display: block !important;
                }
                .mce-pagebreak, div.mce-pagebreak, p.mce-pagebreak, img.mce-pagebreak {
                  display: block !important;
                  clear: both !important;
                  width: calc(100% + ${margin.left + margin.right}mm) !important;
                  margin-left: -${margin.left}mm !important;
                  margin-right: -${margin.right}mm !important;
                  margin-top: 36px !important;
                  margin-bottom: 36px !important;
                  height: 32px !important;
                  background-color: #94a3b8 !important;
                  border-top: 2px dashed #475569 !important;
                  border-bottom: 2px dashed #475569 !important;
                  box-shadow: inset 0 3px 6px rgba(0,0,0,0.2) !important;
                  position: relative !important;
                  cursor: pointer !important;
                  box-sizing: border-box !important;
                }
              `,
              table_default_attributes: {
                border: '1',
              },
              table_default_styles: {
                'border-collapse': 'collapse',
                'width': '100%',
              },
              table_responsive_width: true,
              table_appearance_options: true,
              table_grid: true,
            }}
          />
        </div>

      </div>
    </Modal>
  );
};

export default WordEditorModal;
