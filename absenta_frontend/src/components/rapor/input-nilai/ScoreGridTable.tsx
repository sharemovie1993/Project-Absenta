import React, { memo, useState, useRef, useEffect } from 'react';
import { Copy, Trash2, ClipboardPaste, Save, Download, FileSpreadsheet, Upload, ShieldAlert, Lock, Eye, ChevronDown } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { StudentScoreItem } from '../../../types/inputNilai.types';

interface ScoreGridTableProps {
  scores: StudentScoreItem[];
  entryMode: 'sumatif' | 'kategori';
  subjectName?: string;
  className?: string;
  teacherName?: string;
  kkmThreshold: number;
  onKkmThresholdChange: (newVal: number) => void;
  onScoreChange: (index: number, field: keyof StudentScoreItem, val: any) => void;
  onCopyCpToAll: (sourceCp: string) => void;
  onClearCpAll: () => void;
  onKeyDownGrid: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, rowIndex: number, colIndex: number) => void;
  getScoreInputStyle: (scoreVal: any) => string;
  onShowPasteModal: () => void;
  onSaveSubmit: () => void;
  onDownloadTemplate?: () => void;
  onExportEraporKemendikbud?: () => void;
  onUploadSubmit?: (file: File) => void;
  isSaving: boolean;
  isLoading: boolean;
  isUploading?: boolean;
  isReadOnly?: boolean;
  readOnlyReason?: string;
}

export const ScoreGridTable: React.FC<ScoreGridTableProps> = memo(({
  scores,
  entryMode,
  subjectName,
  className: rombelName,
  teacherName,
  kkmThreshold,
  onKkmThresholdChange,
  onScoreChange,
  onCopyCpToAll,
  onClearCpAll,
  onKeyDownGrid,
  getScoreInputStyle,
  onShowPasteModal,
  onSaveSubmit,
  onDownloadTemplate,
  onExportEraporKemendikbud,
  onUploadSubmit,
  isSaving,
  isLoading,
  isUploading,
  isReadOnly = false,
  readOnlyReason,
}) => {
  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

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

  return (
    <Card className="w-full p-4 sm:p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-3">
      {/* Sleek, De-noised Header Bar */}
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

        {/* Toolbar Action Group (Excel Dropdown / Paste / Save) */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {/* Dropdown Menu Berkas Excel (Impor & Ekspor) */}
          {(onExportEraporKemendikbud || (!isReadOnly && (onDownloadTemplate || onUploadSubmit))) && (
            <div className="relative inline-block text-left" ref={excelMenuRef}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExcelMenuOpen((prev) => !prev)}
                className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                title="Pilihan ekspor, unduh template, dan unggah nilai Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Berkas Excel</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isExcelMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              {isExcelMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-1 space-y-0.5">
                    {!isReadOnly && onDownloadTemplate && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsExcelMenuOpen(false);
                          onDownloadTemplate();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                      >
                        <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <FileSpreadsheet size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100">Unduh Template Excel</div>
                          <div className="text-[10px] text-slate-400 truncate">Format kosongan siap isi</div>
                        </div>
                      </button>
                    )}

                    {!isReadOnly && onUploadSubmit && (
                      <label className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group">
                        <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Upload size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {isUploading ? 'Mengunggah...' : 'Upload Excel Nilai'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Impor dari berkas spreadsheet</div>
                        </div>
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
                        <div className="w-6 h-6 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Download size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100">Export e-Rapor Kemendikbud</div>
                          <div className="text-[10px] text-slate-400 truncate">Format resmi dinas pendidikan</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!isReadOnly && entryMode === 'sumatif' && (
            <Button 
              type="button"
              aria-label="Paste nilai dari Excel"
              onClick={onShowPasteModal}
              variant="outline"
              className="border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl font-bold text-xs cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5 mr-1" />
              <span>Paste Excel</span>
            </Button>
          )}

          {!isReadOnly && (
            <Button 
              type="button"
              aria-label="Simpan perubahan nilai"
              onClick={onSaveSubmit}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none text-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>{isSaving ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400 text-xs italic">Menarik daftar siswa rombel...</div>
      ) : scores.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-xs italic">Rombel kosong atau tidak ada siswa aktif.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3">Nama Siswa</th>
                {entryMode === 'sumatif' ? (
                  <>
                    <th className="py-3 px-2 text-center w-16">Sum 1</th>
                    <th className="py-3 px-2 text-center w-16">Sum 2</th>
                    <th className="py-3 px-2 text-center w-16">Sum 3</th>
                    <th className="py-3 px-2 text-center w-20 bg-slate-100 dark:bg-slate-800/80">Rata2 Sum</th>
                    <th className="py-3 px-2 text-center w-20">Sum Akhir</th>
                    <th className="py-3 px-2 text-center w-20 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">Nilai Rapor</th>
                    <th className="py-3 px-3">
                      <div className="flex items-center justify-between gap-2">
                        <span>Capaian Kompetensi (CP)</span>
                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label="Salin CP baris pertama ke semua siswa"
                              onClick={() => onCopyCpToAll(scores[0]?.deskripsi_cp || '')}
                              title="Salin CP Baris Pertama ke Semua Siswa"
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-all"
                            >
                              <Copy size={11} /> 1-Klik Salin ke Semua
                            </button>
                            <button
                              type="button"
                              aria-label="Kosongkan semua CP"
                              onClick={onClearCpAll}
                              title="Kosongkan Semua CP"
                              className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-all"
                            >
                              <Trash2 size={11} /> Kosongkan CP
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-3 text-center w-24">Nilai</th>
                    <th className="py-3 px-3">Deskripsi Rapor</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
              {scores?.map((sc: StudentScoreItem, idx: number) => {
                const s1 = parseFloat(sc.sumatif_1 as string) || 0;
                const s2 = parseFloat(sc.sumatif_2 as string) || 0;
                const s3 = parseFloat(sc.sumatif_3 as string) || 0;
                const cnt = (sc.sumatif_1 ? 1 : 0) + (sc.sumatif_2 ? 1 : 0) + (sc.sumatif_3 ? 1 : 0);
                const avg = cnt > 0 ? (s1 + s2 + s3) / cnt : 0;
                
                const sAkhir = parseFloat(sc.sumatif_akhir as string) || 0;
                const hasSAkhir = sc.sumatif_akhir !== undefined && sc.sumatif_akhir !== null && sc.sumatif_akhir !== '';
                const finalGrade = cnt > 0 && hasSAkhir 
                  ? Math.round((avg + sAkhir) / 2) 
                  : (cnt > 0 ? Math.round(avg) : (hasSAkhir ? Math.round(sAkhir) : '-'));

                return (
                  <tr key={sc.siswa_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{sc.nama}</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIS: {sc.nis}</div>
                    </td>

                    {entryMode === 'sumatif' ? (
                      <>
                        <td className="py-1.5 px-1">
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
                            className={`w-full text-center border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 font-mono font-bold ${
                              isReadOnly
                                ? 'cursor-default select-text'
                                : 'focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all'
                            } ${getScoreInputStyle(sc.sumatif_1)}`}
                            placeholder={isReadOnly ? '-' : '0-100'}
                          />
                        </td>
                        <td className="py-1.5 px-1">
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
                            className={`w-full text-center border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 font-mono font-bold ${
                              isReadOnly
                                ? 'cursor-default select-text'
                                : 'focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all'
                            } ${getScoreInputStyle(sc.sumatif_2)}`}
                            placeholder={isReadOnly ? '-' : '0-100'}
                          />
                        </td>
                        <td className="py-1.5 px-1">
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
                            className={`w-full text-center border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 font-mono font-bold ${
                              isReadOnly
                                ? 'cursor-default select-text'
                                : 'focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all'
                            } ${getScoreInputStyle(sc.sumatif_3)}`}
                            placeholder={isReadOnly ? '-' : '0-100'}
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300">
                          {cnt > 0 ? avg.toFixed(1) : '-'}
                        </td>
                        <td className="py-1.5 px-1">
                          <input
                            id={`input-grid-${idx}-3`}
                            aria-label={`Sumatif Akhir untuk ${sc.nama}`}
                            type="text"
                            inputMode="decimal"
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={sc.sumatif_akhir ?? ''}
                            onChange={(e) => onScoreChange(idx, 'sumatif_akhir', e.target.value)}
                            onKeyDown={(e) => onKeyDownGrid(e, idx, 3)}
                            className={`w-full text-center border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 font-mono font-bold ${
                              isReadOnly
                                ? 'cursor-default select-text'
                                : 'focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all'
                            } ${getScoreInputStyle(sc.sumatif_akhir)}`}
                            placeholder={isReadOnly ? '-' : '0-100'}
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-black text-sm bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300">
                          {finalGrade}
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-1">
                            <textarea
                              id={`input-grid-${idx}-4`}
                              aria-label={`Capaian Kompetensi untuk ${sc.nama}`}
                              rows={2}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              value={sc.deskripsi_cp ?? ''}
                              onChange={(e) => onScoreChange(idx, 'deskripsi_cp', e.target.value)}
                              onKeyDown={(e) => onKeyDownGrid(e, idx, 4)}
                              placeholder={isReadOnly ? '(Belum diisi oleh guru pengampu)' : 'Deskripsi Capaian Kompetensi (CP)...'}
                              className={`w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 ${
                                isReadOnly
                                  ? 'bg-slate-50/70 dark:bg-slate-800/40 cursor-default select-text resize-none'
                                  : 'bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y'
                              }`}
                            />
                            {!isReadOnly && (
                              <button
                                type="button"
                                aria-label={`Salin CP ${sc.nama} ke siswa di bawahnya`}
                                onClick={() => onCopyCpToAll(sc.deskripsi_cp || '')}
                                title="Salin CP ini ke semua siswa di bawahnya"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Copy size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-1.5 px-3">
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
                            className={`w-full text-center border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 font-mono font-bold ${
                              isReadOnly
                                ? 'cursor-default select-text'
                                : 'focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all'
                            } ${getScoreInputStyle(sc.nilai)}`}
                            placeholder={isReadOnly ? '-' : '0-100'}
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <textarea
                            id={`input-grid-${idx}-1`}
                            aria-label={`Deskripsi Rapor Kategori untuk ${sc.nama}`}
                            rows={2}
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={sc.deskripsi ?? ''}
                            onChange={(e) => onScoreChange(idx, 'deskripsi', e.target.value)}
                            onKeyDown={(e) => onKeyDownGrid(e, idx, 1)}
                            placeholder={isReadOnly ? '(Belum diisi oleh guru pengampu)' : 'Catatan / Deskripsi Kategori...'}
                            className={`w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 ${
                              isReadOnly
                                ? 'bg-slate-50/70 dark:bg-slate-800/40 cursor-default select-text resize-none'
                                : 'bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y'
                            }`}
                          />
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
    </Card>
  );
});

ScoreGridTable.displayName = 'ScoreGridTable';
