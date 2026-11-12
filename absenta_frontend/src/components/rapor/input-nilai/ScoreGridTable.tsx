import React, { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Copy,
  Trash2,
  Save,
  Download,
  FileSpreadsheet,
  Upload,
  ShieldAlert,
  Lock,
  ChevronDown,
  Printer,
  FileText,
  Zap,
  ClipboardPaste,
  ArrowRightLeft,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { StudentScoreItem } from '../../../types/inputNilai.types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ExcelCompareNilaiModal } from './ExcelCompareNilaiModal';

interface ScoreGridTableProps {
  scores: StudentScoreItem[];
  entryMode: 'sumatif' | 'kategori';
  sumberNilaiMode?: 'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL';
  subjectName?: string;
  className?: string;
  teacherName?: string;
  kkmThreshold: number;
  onKkmThresholdChange: (newVal: number) => void;
  onScoreChange: (index: number, field: keyof StudentScoreItem, val: any) => void;
  onBulkPaste?: (startRowIndex: number, startColIndex: number, clipboardText: string) => boolean;
  onBatchScoresChange?: (newScores: StudentScoreItem[]) => void;
  onCopyCpToAll: (sourceCp: string) => void;
  onClearCpAll: () => void;
  onKeyDownGrid: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    rowIndex: number,
    colIndex: number
  ) => void;
  getScoreInputStyle: (scoreVal: any) => string;
  onSaveSubmit: () => void;
  onDownloadTemplate?: () => void;
  onExportEraporKemendikbud?: () => void;
  onUploadSubmit?: (file: File) => void;
  onNavigateCetakRapor?: () => void;
  isSaving: boolean;
  isLoading: boolean;
  isUploading?: boolean;
  isReadOnly?: boolean;
  readOnlyReason?: string;
}

export const ScoreGridTable: React.FC<ScoreGridTableProps> = memo(({
  scores,
  entryMode,
  sumberNilaiMode,
  subjectName,
  className: rombelName,
  teacherName,
  kkmThreshold,
  onKkmThresholdChange,
  onScoreChange,
  onBulkPaste,
  onBatchScoresChange,
  onCopyCpToAll,
  onClearCpAll,
  onKeyDownGrid,
  getScoreInputStyle,
  onSaveSubmit,
  onDownloadTemplate,
  onExportEraporKemendikbud,
  onUploadSubmit,
  onNavigateCetakRapor,
  isSaving,
  isLoading,
  isUploading,
  isReadOnly = false,
  readOnlyReason,
}) => {
  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  // Active focused cell tracking for Excel formula bar & active cell highlights
  const [activeCell, setActiveCell] = useState<{
    row: number;
    col: number;
    field: string;
    colLetter: string;
    studentName?: string;
  } | null>(null);

  // Deteksi mode perhitungan nilai rapor (Otomatis vs As-Is Nilai Jadi)
  const isAsIsScoreMode = useMemo(() => {
    if (sumberNilaiMode) return sumberNilaiMode === 'MURNI_CP_MANUAL';
    if (!scores || scores.length === 0) return false;

    const asIsCount = scores.filter((sc) => {
      const hasSumatif = Boolean(sc.sumatif_1 || sc.sumatif_2 || sc.sumatif_3 || sc.sumatif_4 || sc.sumatif_akhir);
      const hasFinal = sc.nilai_rapor_final !== undefined && sc.nilai_rapor_final !== null && sc.nilai_rapor_final !== '';
      return !hasSumatif && hasFinal;
    }).length;

    return asIsCount > scores.length * 0.3;
  }, [sumberNilaiMode, scores]);

  // Close Excel dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) {
        setIsExcelMenuOpen(false);
      }
    };
    if (isExcelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExcelMenuOpen]);

  // Active Cell Coordinate (e.g. "B4", "C12")
  const activeCoordinate = useMemo(() => {
    if (!activeCell) return 'A1';
    return `${activeCell.colLetter}${activeCell.row + 1}`;
  }, [activeCell]);

  // Formula & Value preview inside the Excel Formula Bar
  const activeFormulaPreview = useMemo(() => {
    if (!activeCell || !scores[activeCell.row]) {
      return 'Klik salah satu sel untuk navigasi atau tempel (Ctrl+V) langsung dari Excel / Google Sheets.';
    }
    const currentStudent = scores[activeCell.row];
    const fieldVal = (currentStudent as Record<string, any>)[activeCell.field];

    if (
      activeCell.field === 'sumatif_1' ||
      activeCell.field === 'sumatif_2' ||
      activeCell.field === 'sumatif_3' ||
      activeCell.field === 'sumatif_4'
    ) {
      const fieldTitle = activeCell.field.replace('_', ' ').toUpperCase();
      return `[${currentStudent.nama}] ${fieldTitle} = ${
        fieldVal !== null && fieldVal !== undefined && fieldVal !== '' ? fieldVal : '(Kosong)'
      } • Standar KKM: ${kkmThreshold}`;
    }
    if (activeCell.field === 'sumatif_akhir') {
      return `[${currentStudent.nama}] SUMATIF AKHIR (SAS/ASAT) = ${
        fieldVal !== null && fieldVal !== undefined && fieldVal !== '' ? fieldVal : '(Kosong)'
      }`;
    }
    if (activeCell.field === 'deskripsi_cp') {
      return `[${currentStudent.nama}] CP = "${fieldVal || '(Belum diisi)'}"`;
    }
    if (activeCell.field === 'nilai') {
      return `[${currentStudent.nama}] Nilai = ${
        fieldVal !== null && fieldVal !== undefined && fieldVal !== '' ? fieldVal : '(Kosong)'
      }`;
    }
    if (activeCell.field === 'deskripsi') {
      return `[${currentStudent.nama}] Deskripsi = "${fieldVal || '(Belum diisi)'}"`;
    }
    return `[${currentStudent.nama}] ${String(fieldVal ?? '')}`;
  }, [activeCell, scores, kkmThreshold]);

  // Handle Paste inside cell
  const handleCellPaste = useCallback(
    (e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
      const text = e.clipboardData.getData('text/plain');
      if (!text) return;

      // Multi-cell detection: contains tab (columns) or newline (rows)
      if (text.includes('\t') || text.includes('\n')) {
        e.preventDefault();
        onBulkPaste?.(rowIndex, colIndex, text);
      }
    },
    [onBulkPaste]
  );

  // Button: Paste from Clipboard API
  const handlePasteFromClipboardButton = useCallback(async () => {
    if (isReadOnly) {
      toast.error('Tidak dapat menempel nilai: Mode Hanya Baca aktif.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.warning('Clipboard kosong. Silakan salin (Ctrl+C) data dari Excel terlebih dahulu.');
        return;
      }
      const targetRow = activeCell?.row ?? 0;
      const targetCol = activeCell?.col ?? 0;
      onBulkPaste?.(targetRow, targetCol, text);
    } catch {
      toast.info('Gunakan pintasan keyboard (Ctrl + V) langsung pada sel input untuk menempel nilai dari Excel.');
    }
  }, [isReadOnly, activeCell, onBulkPaste]);

  // Button: Copy All Scores to Clipboard in TSV (Excel format)
  const handleCopyAllScoresToClipboard = useCallback(() => {
    if (!scores || scores.length === 0) {
      toast.warning('Belum ada data nilai siswa untuk disalin.');
      return;
    }

    if (entryMode === 'sumatif') {
      const headers = [
        'NO',
        'NIS',
        'NAMA SISWA',
        'SUM 1',
        'SUM 2',
        'SUM 3',
        'SUM 4',
        'RATA2 SUM',
        'SUM AKHIR',
        'NILAI RAPOR',
        'CAPAIAN KOMPETENSI (CP)',
      ];
      const rows = scores.map((sc, idx) => {
        const s1 = parseFloat(sc.sumatif_1 as string) || 0;
        const s2 = parseFloat(sc.sumatif_2 as string) || 0;
        const s3 = parseFloat(sc.sumatif_3 as string) || 0;
        const s4 = parseFloat(sc.sumatif_4 as string) || 0;
        const cnt = (sc.sumatif_1 ? 1 : 0) + (sc.sumatif_2 ? 1 : 0) + (sc.sumatif_3 ? 1 : 0) + (sc.sumatif_4 ? 1 : 0);
        const avg = cnt > 0 ? (s1 + s2 + s3 + s4) / cnt : 0;
        const sAkhir = parseFloat(sc.sumatif_akhir as string) || 0;
        const hasSAkhir = sc.sumatif_akhir !== undefined && sc.sumatif_akhir !== null && sc.sumatif_akhir !== '';
        const calculatedFinal =
          cnt > 0 && hasSAkhir
            ? Math.round((avg + sAkhir) / 2)
            : cnt > 0
            ? Math.round(avg)
            : hasSAkhir
            ? Math.round(sAkhir)
            : '';
        const persistedFinal = sc.nilai_rapor_final ?? sc.nilai;
        const finalGrade =
          cnt === 0 && !hasSAkhir && persistedFinal !== null && persistedFinal !== undefined
            ? Math.round(Number(persistedFinal))
            : calculatedFinal;

        return [
          idx + 1,
          sc.nis,
          sc.nama,
          sc.sumatif_1 ?? '',
          sc.sumatif_2 ?? '',
          sc.sumatif_3 ?? '',
          sc.sumatif_4 ?? '',
          cnt > 0 ? avg.toFixed(1) : '',
          sc.sumatif_akhir ?? '',
          finalGrade,
          sc.deskripsi_cp ?? '',
        ].join('\t');
      });

      const tsv = [headers.join('\t'), ...rows].join('\n');
      navigator.clipboard
        .writeText(tsv)
        .then(() => {
          toast.success(`Berhasil menyalin ${scores.length} baris nilai ke clipboard format Excel!`, { icon: '📋' });
        })
        .catch(() => {
          toast.error('Gagal menyalin ke clipboard.');
        });
    } else {
      const headers = ['NO', 'NIS', 'NAMA SISWA', 'NILAI', 'DESKRIPSI RAPOR'];
      const rows = scores.map((sc, idx) => [
        idx + 1,
        sc.nis,
        sc.nama,
        sc.nilai ?? '',
        sc.deskripsi ?? '',
      ].join('\t'));

      const tsv = [headers.join('\t'), ...rows].join('\n');
      navigator.clipboard
        .writeText(tsv)
        .then(() => {
          toast.success(`Berhasil menyalin ${scores.length} baris nilai ke clipboard format Excel!`, { icon: '📋' });
        })
        .catch(() => {
          toast.error('Gagal menyalin ke clipboard.');
        });
    }
  }, [scores, entryMode]);

  // Check if a cell is currently focused
  const isCellActive = (r: number, c: number) => activeCell?.row === r && activeCell?.col === c;

  return (
    <Card className="w-full p-3 sm:p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-3">
      {/* Sleek Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {subjectName || 'Lembar Nilai'}
              {rombelName && <span className="text-slate-400 font-normal"> • {rombelName}</span>}
            </h3>
            <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md">
              {scores.length} Siswa
            </span>
            {isAsIsScoreMode ? (
              <span
                title="Nilai rapor menggunakan nilai jadi dari dokumen cetak fisik asli (tanpa dihitung ulang rumus)"
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md cursor-help transition-all shadow-2xs"
              >
                <FileText size={11} className="text-amber-600 dark:text-amber-400" />
                <span>Mode: Salin Nilai Jadi (As-Is)</span>
              </span>
            ) : (
              <span
                title="Nilai rapor dikalkulasi otomatis dari rangkaian asesmen materi (Sumatif 1, 2, 3 guru)"
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md cursor-help transition-all shadow-2xs"
              >
                <Zap size={11} className="text-indigo-600 dark:text-indigo-400" />
                <span>Mode: Hitung Otomatis (Rumus)</span>
              </span>
            )}
            {isReadOnly && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                <Lock size={11} className="text-amber-600 dark:text-amber-400" />
                <span>Hanya Baca {teacherName ? `• Pengampu: ${teacherName}` : ''}</span>
              </span>
            )}
          </div>

          {/* Compact Legend & KKM Row */}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 dark:text-slate-400">KKM:</span>
              {isReadOnly ? (
                <span className="font-bold text-slate-700 dark:text-slate-200">{kkmThreshold}</span>
              ) : (
                <input
                  id="kkm-threshold-input"
                  aria-label="Batas KKM Mapel Ini"
                  type="number"
                  min={50}
                  max={95}
                  value={kkmThreshold}
                  onChange={(e) => onKkmThresholdChange(parseInt(e.target.value, 10) || 70)}
                  className="w-10 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold text-indigo-600 dark:text-indigo-400 py-0.5"
                />
              )}
            </div>

            <span className="text-slate-300 dark:text-slate-700">•</span>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> &lt;{kkmThreshold} Remedial
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {kkmThreshold}–{Math.max(84, kkmThreshold + 14)} Tuntas
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ≥{Math.max(85, kkmThreshold + 15)} Sangat Baik
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar Action Group (Import / Export Dropdown, Simpan, Cetak Rapor) */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {/* Dropdown Menu Import / Export */}
          {(onExportEraporKemendikbud || (!isReadOnly && (onDownloadTemplate || onUploadSubmit))) && (
            <div className="relative inline-block text-left" ref={excelMenuRef}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExcelMenuOpen((prev) => !prev)}
                className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs h-[36px] px-3 flex items-center gap-1.5 cursor-pointer"
                title="Pilihan ekspor, unduh template, dan unggah nilai Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Import / Export</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isExcelMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              {isExcelMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-1 space-y-0.5">
                    {!isReadOnly && onBatchScoresChange && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsExcelMenuOpen(false);
                          setIsCompareModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-100">Smart Komparasi Nilai</span>
                      </button>
                    )}

                    {!isReadOnly && onDownloadTemplate && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsExcelMenuOpen(false);
                          onDownloadTemplate();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-100">Download Format Nilai</span>
                      </button>
                    )}

                    {!isReadOnly && onUploadSubmit && (
                      <label className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group">
                        <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {isUploading ? 'Mengunggah...' : 'Import Nilai'}
                        </span>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onUploadSubmit) {
                              setIsExcelMenuOpen(false);
                              onUploadSubmit(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {onExportEraporKemendikbud && (
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsExcelMenuOpen(false);
                          onExportEraporKemendikbud();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                      >
                        <Download className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-100">Export format E-Rapor</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tombol Simpan */}
          {!isReadOnly && (
            <Button
              type="button"
              aria-label="Simpan perubahan nilai"
              onClick={onSaveSubmit}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none text-xs h-[36px] px-3.5 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
            </Button>
          )}

          {/* Tombol Navigasi Cetak Rapor */}
          {onNavigateCetakRapor && (
            <Button
              type="button"
              variant="outline"
              onClick={onNavigateCetakRapor}
              className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl font-bold text-xs h-[36px] px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Buka Lembar Cetak Rapor Siswa"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Cetak Rapor</span>
            </Button>
          )}
        </div>
      </div>

      {isReadOnly && readOnlyReason && (
        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold mr-1">Status Penguncian:</span>
            <span>{readOnlyReason}</span>
          </div>
        </div>
      )}

      {isAsIsScoreMode && !isReadOnly && (
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200 shadow-2xs">
          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-bold mr-1">Mode Nilai Jadi (As-Is):</span>
            <span>
              Nilai rapor pada lembar ini menggunakan angka rapor fisik cetak asli (tanpa dihitung ulang oleh rumus
              sumatif). Menjamin keaslian data arsip/alumni.
            </span>
          </div>
        </div>
      )}

      {/* EXCEL FORMULA & SPREADSHEET TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono shadow-2xs">
        {/* Active Cell Box & Formula Bar */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Excel Name Box (e.g. "B4", "C12") */}
          <div
            className="flex items-center justify-center px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100 font-bold min-w-[70px] shadow-2xs select-none"
            title="Koordinat Sel Aktif"
          >
            <span className="text-emerald-700 dark:text-emerald-400 font-black">{activeCoordinate}</span>
          </div>

          {/* Formula 'fx' indicator */}
          <div className="font-serif italic font-black text-slate-400 dark:text-slate-500 select-none px-0.5 text-sm">
            fx
          </div>

          {/* Value / Formula display */}
          <div
            className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 truncate font-mono text-[11px]"
            title={activeFormulaPreview}
          >
            {activeFormulaPreview}
          </div>
        </div>

        {/* Excel Clipboard Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          {!isReadOnly && onBatchScoresChange && (
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              title="Buka Smart Komparasi Nilai dari Excel (mencocokkan nilai per siswa tanpa khawatir tertukar baris)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-sans font-bold text-[11px] shadow-2xs cursor-pointer transition-colors"
            >
              <ArrowRightLeft size={13} />
              <span>Smart Komparasi Excel</span>
            </button>
          )}

          {!isReadOnly && (
            <button
              type="button"
              onClick={handlePasteFromClipboardButton}
              title="Tempel data Excel dari clipboard ke sel yang dipilih (Ctrl + V)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-sans font-bold text-[11px] shadow-2xs cursor-pointer transition-colors"
            >
              <ClipboardPaste size={13} />
              <span>Paste Clipboard</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyAllScoresToClipboard}
            title="Salin seluruh tabel nilai ke clipboard dalam format Excel (TSV)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded font-sans font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
          >
            <Copy size={13} />
            <span>Salin ke Excel</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400 text-xs italic">Menarik daftar siswa rombel...</div>
      ) : scores.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-xs italic">Rombel kosong atau tidak ada siswa aktif.</div>
      ) : (
        <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs bg-white dark:bg-slate-900">
          <table className="w-full text-xs text-left border-collapse border-spacing-0 select-text">
            {/* EXCEL COLUMN HEADERS */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700">
              <tr>
                <th className="py-2 px-2 w-12 text-center border-r border-slate-300 dark:border-slate-700 font-mono text-[10px] text-slate-400 bg-slate-200/50 dark:bg-slate-800/90 select-none">
                  #
                </th>
                <th className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 min-w-[200px]">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-0.5">
                    <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">A</span>
                    <span>SISWA</span>
                  </div>
                  <span className="text-slate-800 dark:text-slate-100 font-black">NAMA SISWA</span>
                </th>

                {entryMode === 'sumatif' ? (
                  <>
                    <th className="py-2 px-1 text-center w-20 min-w-[70px] border-r border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">B</span>
                      </div>
                      <span className="text-slate-800 dark:text-slate-100 font-bold">SUM 1</span>
                    </th>
                    <th className="py-2 px-1 text-center w-20 min-w-[70px] border-r border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">C</span>
                      </div>
                      <span className="text-slate-800 dark:text-slate-100 font-bold">SUM 2</span>
                    </th>
                    <th className="py-2 px-1 text-center w-20 min-w-[70px] border-r border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">D</span>
                      </div>
                      <span className="text-slate-800 dark:text-slate-100 font-bold">SUM 3</span>
                    </th>
                    <th className="py-2 px-1 text-center w-20 min-w-[70px] border-r border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">E</span>
                      </div>
                      <span className="text-slate-800 dark:text-slate-100 font-bold">SUM 4</span>
                    </th>
                    <th className="py-2 px-1 text-center w-22 min-w-[75px] border-r border-slate-300 dark:border-slate-700 bg-slate-200/40 dark:bg-slate-800/60">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="bg-slate-300 dark:bg-slate-600 px-1 rounded text-[9px] font-bold">F</span>
                        <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">fx</span>
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-bold">RATA2 SUM</span>
                    </th>
                    <th className="py-2 px-1 text-center w-22 min-w-[75px] border-r border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">G</span>
                      </div>
                      <span className="text-slate-800 dark:text-slate-100 font-bold">SUM AKHIR</span>
                    </th>
                    <th
                      className={cn(
                        'py-2 px-1 text-center w-24 min-w-[85px] border-r border-slate-300 dark:border-slate-700 transition-colors',
                        isAsIsScoreMode
                          ? 'bg-amber-100/70 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                          : 'bg-indigo-100/60 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      )}
                    >
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono mb-0.5">
                        <span className="bg-indigo-200/70 dark:bg-indigo-800 px-1 rounded text-[9px] font-bold">H</span>
                        <span className="text-[9px] font-mono font-bold">fx</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-extrabold">NILAI RAPOR</span>
                        <span className="text-[8px] font-bold lowercase text-slate-400">
                          {isAsIsScoreMode ? '(As-Is)' : '(Rumus)'}
                        </span>
                      </div>
                    </th>
                    <th className="py-2 px-3 min-w-[280px]">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                            <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">I</span>
                            <span>CAPAIAN</span>
                          </div>
                          <span className="text-slate-800 dark:text-slate-100 font-bold">CAPAIAN KOMPETENSI (CP)</span>
                        </div>
                        {!isReadOnly && (
                          <div className="flex items-center gap-1 font-sans">
                            <button
                              type="button"
                              aria-label="Salin CP baris pertama ke semua siswa"
                              onClick={() => onCopyCpToAll(scores[0]?.deskripsi_cp || '')}
                              title="Salin CP Baris Pertama ke Semua Siswa"
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Copy size={11} /> Salin ke Semua
                            </button>
                            <button
                              type="button"
                              aria-label="Kosongkan semua CP"
                              onClick={onClearCpAll}
                              title="Kosongkan Semua CP"
                              className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Trash2 size={11} /> Kosongkan
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  </>
                ) : (
                  <>
                    <th className="py-2 px-2 text-center w-28 min-w-[90px] border-r border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">B</span>
                      </div>
                      <span className="text-slate-800 dark:text-slate-100 font-bold">NILAI</span>
                    </th>
                    <th className="py-2 px-3 min-w-[280px]">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">C</span>
                        <span>DESKRIPSI</span>
                      </div>
                      <span className="text-slate-800 dark:text-slate-100 font-bold">DESKRIPSI RAPOR</span>
                    </th>
                  </>
                )}
              </tr>
            </thead>

            {/* EXCEL SPREADSHEET BODY */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80 font-medium text-slate-700 dark:text-slate-300">
              {scores.map((sc: StudentScoreItem, idx: number) => {
                const s1 = parseFloat(sc.sumatif_1 as string) || 0;
                const s2 = parseFloat(sc.sumatif_2 as string) || 0;
                const s3 = parseFloat(sc.sumatif_3 as string) || 0;
                const s4 = parseFloat(sc.sumatif_4 as string) || 0;
                const cnt = (sc.sumatif_1 ? 1 : 0) + (sc.sumatif_2 ? 1 : 0) + (sc.sumatif_3 ? 1 : 0) + (sc.sumatif_4 ? 1 : 0);
                const avg = cnt > 0 ? (s1 + s2 + s3 + s4) / cnt : 0;

                const sAkhir = parseFloat(sc.sumatif_akhir as string) || 0;
                const hasSAkhir = sc.sumatif_akhir !== undefined && sc.sumatif_akhir !== null && sc.sumatif_akhir !== '';
                const calculatedFinal =
                  cnt > 0 && hasSAkhir
                    ? Math.round((avg + sAkhir) / 2)
                    : cnt > 0
                    ? Math.round(avg)
                    : hasSAkhir
                    ? Math.round(sAkhir)
                    : '-';

                const persistedFinal = sc.nilai_rapor_final ?? sc.nilai;
                const hasPersistedFinal = persistedFinal !== undefined && persistedFinal !== null && persistedFinal !== '';
                const isRowAsIs = (cnt === 0 && !hasSAkhir && hasPersistedFinal) || isAsIsScoreMode;
                const finalGrade =
                  cnt === 0 && !hasSAkhir && hasPersistedFinal ? Math.round(Number(persistedFinal)) : calculatedFinal;

                const isRowActive = activeCell?.row === idx;

                return (
                  <tr
                    key={sc.siswa_id}
                    className={cn(
                      'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-none',
                      isRowActive && 'bg-emerald-50/15 dark:bg-emerald-950/15'
                    )}
                  >
                    {/* Excel Row Index Column */}
                    <td
                      className={cn(
                        'py-1.5 px-2 text-center font-mono text-[11px] border-r border-slate-300 dark:border-slate-700 select-none transition-colors',
                        isRowActive
                          ? 'bg-emerald-100/70 dark:bg-emerald-950/60 font-black text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold'
                      )}
                    >
                      {idx + 1}
                    </td>

                    {/* Student Name & NIS */}
                    <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-700/80">
                      <div className="font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[220px]">
                        {sc.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">NIS: {sc.nis}</div>
                    </td>

                    {entryMode === 'sumatif' ? (
                      <>
                        {/* Col 0: Sumatif 1 (Letter B) */}
                        <td
                          className={cn(
                            'p-0 relative h-9 border border-slate-200 dark:border-slate-700/80 transition-none',
                            isCellActive(idx, 0) &&
                              'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/30 dark:bg-emerald-950/30'
                          )}
                        >
                          <input
                            id={`input-grid-${idx}-0`}
                            aria-label={`Sumatif 1 untuk ${sc.nama}`}
                            type="text"
                            inputMode="decimal"
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={sc.sumatif_1 ?? ''}
                            onChange={(e) => onScoreChange(idx, 'sumatif_1', e.target.value)}
                            onKeyDown={(e) => onKeyDownGrid(e, idx, 0)}
                            onFocus={() => {
                              setActiveCell({ row: idx, col: 0, field: 'sumatif_1', colLetter: 'B', studentName: sc.nama });
                            }}
                            onPaste={(e) => handleCellPaste(e, idx, 0)}
                            className={cn(
                              'w-full h-full text-center font-mono font-bold text-xs bg-transparent border-0 outline-none p-0 m-0',
                              getScoreInputStyle(sc.sumatif_1),
                              isReadOnly ? 'cursor-default select-text' : 'cursor-cell'
                            )}
                            placeholder={isReadOnly ? '-' : ''}
                          />
                          {isCellActive(idx, 0) && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                          )}
                        </td>

                        {/* Col 1: Sumatif 2 (Letter C) */}
                        <td
                          className={cn(
                            'p-0 relative h-9 border border-slate-200 dark:border-slate-700/80 transition-none',
                            isCellActive(idx, 1) &&
                              'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/30 dark:bg-emerald-950/30'
                          )}
                        >
                          <input
                            id={`input-grid-${idx}-1`}
                            aria-label={`Sumatif 2 untuk ${sc.nama}`}
                            type="text"
                            inputMode="decimal"
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={sc.sumatif_2 ?? ''}
                            onChange={(e) => onScoreChange(idx, 'sumatif_2', e.target.value)}
                            onKeyDown={(e) => onKeyDownGrid(e, idx, 1)}
                            onFocus={() => {
                              setActiveCell({ row: idx, col: 1, field: 'sumatif_2', colLetter: 'C', studentName: sc.nama });
                            }}
                            onPaste={(e) => handleCellPaste(e, idx, 1)}
                            className={cn(
                              'w-full h-full text-center font-mono font-bold text-xs bg-transparent border-0 outline-none p-0 m-0',
                              getScoreInputStyle(sc.sumatif_2),
                              isReadOnly ? 'cursor-default select-text' : 'cursor-cell'
                            )}
                            placeholder={isReadOnly ? '-' : ''}
                          />
                          {isCellActive(idx, 1) && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                          )}
                        </td>

                        {/* Col 2: Sumatif 3 (Letter D) */}
                        <td
                          className={cn(
                            'p-0 relative h-9 border border-slate-200 dark:border-slate-700/80 transition-none',
                            isCellActive(idx, 2) &&
                              'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/30 dark:bg-emerald-950/30'
                          )}
                        >
                          <input
                            id={`input-grid-${idx}-2`}
                            aria-label={`Sumatif 3 untuk ${sc.nama}`}
                            type="text"
                            inputMode="decimal"
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={sc.sumatif_3 ?? ''}
                            onChange={(e) => onScoreChange(idx, 'sumatif_3', e.target.value)}
                            onKeyDown={(e) => onKeyDownGrid(e, idx, 2)}
                            onFocus={() => {
                              setActiveCell({ row: idx, col: 2, field: 'sumatif_3', colLetter: 'D', studentName: sc.nama });
                            }}
                            onPaste={(e) => handleCellPaste(e, idx, 2)}
                            className={cn(
                              'w-full h-full text-center font-mono font-bold text-xs bg-transparent border-0 outline-none p-0 m-0',
                              getScoreInputStyle(sc.sumatif_3),
                              isReadOnly ? 'cursor-default select-text' : 'cursor-cell'
                            )}
                            placeholder={isReadOnly ? '-' : ''}
                          />
                          {isCellActive(idx, 2) && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                          )}
                        </td>

                        {/* Col 3: Sumatif 4 (Letter E) */}
                        <td
                          className={cn(
                            'p-0 relative h-9 border border-slate-200 dark:border-slate-700/80 transition-none',
                            isCellActive(idx, 3) &&
                              'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/30 dark:bg-emerald-950/30'
                          )}
                        >
                          <input
                            id={`input-grid-${idx}-3`}
                            aria-label={`Sumatif 4 untuk ${sc.nama}`}
                            type="text"
                            inputMode="decimal"
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={sc.sumatif_4 ?? ''}
                            onChange={(e) => onScoreChange(idx, 'sumatif_4', e.target.value)}
                            onKeyDown={(e) => onKeyDownGrid(e, idx, 3)}
                            onFocus={() => {
                              setActiveCell({ row: idx, col: 3, field: 'sumatif_4', colLetter: 'E', studentName: sc.nama });
                            }}
                            onPaste={(e) => handleCellPaste(e, idx, 3)}
                            className={cn(
                              'w-full h-full text-center font-mono font-bold text-xs bg-transparent border-0 outline-none p-0 m-0',
                              getScoreInputStyle(sc.sumatif_4),
                              isReadOnly ? 'cursor-default select-text' : 'cursor-cell'
                            )}
                            placeholder={isReadOnly ? '-' : ''}
                          />
                          {isCellActive(idx, 3) && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                          )}
                        </td>

                        {/* Computed: Rata2 Sumatif (Letter F) */}
                        <td className="py-1 px-1 text-center font-mono font-bold text-xs border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 select-none">
                          {cnt > 0 ? avg.toFixed(1) : '-'}
                        </td>

                        {/* Col 4: Sumatif Akhir (Letter G) */}
                        <td
                          className={cn(
                            'p-0 relative h-9 border border-slate-200 dark:border-slate-700/80 transition-none',
                            isCellActive(idx, 4) &&
                              'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/30 dark:bg-emerald-950/30'
                          )}
                        >
                          <input
                            id={`input-grid-${idx}-4`}
                            aria-label={`Sumatif Akhir untuk ${sc.nama}`}
                            type="text"
                            inputMode="decimal"
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={sc.sumatif_akhir ?? ''}
                            onChange={(e) => onScoreChange(idx, 'sumatif_akhir', e.target.value)}
                            onKeyDown={(e) => onKeyDownGrid(e, idx, 4)}
                            onFocus={() => {
                              setActiveCell({ row: idx, col: 4, field: 'sumatif_akhir', colLetter: 'G', studentName: sc.nama });
                            }}
                            onPaste={(e) => handleCellPaste(e, idx, 4)}
                            className={cn(
                              'w-full h-full text-center font-mono font-bold text-xs bg-transparent border-0 outline-none p-0 m-0',
                              getScoreInputStyle(sc.sumatif_akhir),
                              isReadOnly ? 'cursor-default select-text' : 'cursor-cell'
                            )}
                            placeholder={isReadOnly ? '-' : ''}
                          />
                          {isCellActive(idx, 4) && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                          )}
                        </td>

                        {/* Computed: Nilai Rapor Final (Letter H) */}
                        <td
                          className={cn(
                            'py-1 px-1 text-center font-mono font-black text-sm border border-slate-200 dark:border-slate-700/80 transition-colors select-none',
                            isRowAsIs
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                              : 'bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                          )}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{finalGrade}</span>
                            {isRowAsIs ? (
                              <span
                                title="Nilai rapor disalin murni dari dokumen cetak fisik asli (tanpa dihitung ulang rumus)"
                                className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 cursor-help"
                              >
                                As-Is
                              </span>
                            ) : (
                              <span
                                title="Nilai rapor dihitung otomatis dari nilai sumatif materi"
                                className="text-[8px] font-bold px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 cursor-help"
                              >
                                fx
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Col 5: Capaian Kompetensi (CP) (Letter I) */}
                        <td
                          className={cn(
                            'p-0 relative border border-slate-200 dark:border-slate-700/80 transition-none',
                            isCellActive(idx, 5) &&
                              'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/15 dark:bg-emerald-950/20'
                          )}
                        >
                          <div className="flex items-center w-full h-full min-h-[36px] px-2 py-0.5 gap-1.5">
                            <textarea
                              id={`input-grid-${idx}-5`}
                              aria-label={`Capaian Kompetensi untuk ${sc.nama}`}
                              rows={1}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              value={sc.deskripsi_cp ?? ''}
                              onChange={(e) => onScoreChange(idx, 'deskripsi_cp', e.target.value)}
                              onKeyDown={(e) => onKeyDownGrid(e, idx, 5)}
                              onFocus={() => {
                                setActiveCell({ row: idx, col: 5, field: 'deskripsi_cp', colLetter: 'I', studentName: sc.nama });
                              }}
                              onPaste={(e) => handleCellPaste(e, idx, 5)}
                              placeholder={isReadOnly ? '(Belum diisi)' : 'Capaian Kompetensi (CP)...'}
                              className={cn(
                                'w-full text-xs bg-transparent border-0 outline-none p-0 m-0 text-slate-800 dark:text-slate-200 resize-none font-sans leading-snug',
                                isReadOnly ? 'cursor-default select-text' : 'cursor-text'
                              )}
                            />
                            {!isReadOnly && (
                              <button
                                type="button"
                                aria-label={`Salin CP ${sc.nama} ke semua siswa`}
                                onClick={() => onCopyCpToAll(sc.deskripsi_cp || '')}
                                title="Salin CP ini ke semua siswa di bawahnya"
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors shrink-0 cursor-pointer"
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                          {isCellActive(idx, 5) && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Col 0: Nilai Kategori (Letter B) */}
                        <td
                          className={cn(
                            'p-0 relative h-9 border border-slate-200 dark:border-slate-700/80 transition-none',
                            isCellActive(idx, 0) &&
                              'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/30 dark:bg-emerald-950/30'
                          )}
                        >
                          <input
                            id={`input-grid-${idx}-0`}
                            aria-label={`Nilai Kategori untuk ${sc.nama}`}
                            type="text"
                            inputMode="decimal"
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={sc.nilai ?? ''}
                            onChange={(e) => onScoreChange(idx, 'nilai', e.target.value)}
                            onKeyDown={(e) => onKeyDownGrid(e, idx, 0)}
                            onFocus={() => {
                              setActiveCell({ row: idx, col: 0, field: 'nilai', colLetter: 'B', studentName: sc.nama });
                            }}
                            onPaste={(e) => handleCellPaste(e, idx, 0)}
                            className={cn(
                              'w-full h-full text-center font-mono font-bold text-xs bg-transparent border-0 outline-none p-0 m-0',
                              getScoreInputStyle(sc.nilai),
                              isReadOnly ? 'cursor-default select-text' : 'cursor-cell'
                            )}
                            placeholder={isReadOnly ? '-' : ''}
                          />
                          {isCellActive(idx, 0) && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                          )}
                        </td>

                        {/* Col 1: Deskripsi Kategori (Letter C) */}
                        <td
                          className={cn(
                            'p-0 relative border border-slate-200 dark:border-slate-700/80 transition-none',
                            isCellActive(idx, 1) &&
                              'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/15 dark:bg-emerald-950/20'
                          )}
                        >
                          <div className="flex items-center w-full h-full min-h-[36px] px-2 py-0.5">
                            <textarea
                              id={`input-grid-${idx}-1`}
                              aria-label={`Deskripsi Rapor Kategori untuk ${sc.nama}`}
                              rows={1}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              value={sc.deskripsi ?? ''}
                              onChange={(e) => onScoreChange(idx, 'deskripsi', e.target.value)}
                              onKeyDown={(e) => onKeyDownGrid(e, idx, 1)}
                              onFocus={() => {
                                setActiveCell({ row: idx, col: 1, field: 'deskripsi', colLetter: 'C', studentName: sc.nama });
                              }}
                              onPaste={(e) => handleCellPaste(e, idx, 1)}
                              placeholder={isReadOnly ? '(Belum diisi)' : 'Catatan / Deskripsi Kategori...'}
                              className={cn(
                                'w-full text-xs bg-transparent border-0 outline-none p-0 m-0 text-slate-800 dark:text-slate-200 resize-none font-sans leading-snug',
                                isReadOnly ? 'cursor-default select-text' : 'cursor-text'
                              )}
                            />
                          </div>
                          {isCellActive(idx, 1) && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Excel Helper & Shortcut Bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <FileSpreadsheet size={13} />
            <span>Excel Multi-Cell Ready:</span>
          </span>
          <span>
            Salin data tabel/kolom dari Excel, lalu tekan{' '}
            <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">
              Ctrl + V
            </kbd>{' '}
            di sel mana saja. Gunakan tombol panah,{' '}
            <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">
              Enter
            </kbd>
            , atau{' '}
            <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">
              Tab
            </kbd>{' '}
            untuk bernavigasi antar sel.
          </span>
        </div>
      </div>
      {/* Excel Smart Compare & Import Modal */}
      {isCompareModalOpen && onBatchScoresChange && (
        <ExcelCompareNilaiModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          scores={scores}
          entryMode={entryMode}
          subjectName={subjectName}
          className={rombelName}
          kkmThreshold={kkmThreshold}
          onApplyGrades={(updatedScores) => {
            onBatchScoresChange(updatedScores);
          }}
        />
      )}
    </Card>
  );
});

ScoreGridTable.displayName = 'ScoreGridTable';
