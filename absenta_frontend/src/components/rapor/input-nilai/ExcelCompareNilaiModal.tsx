import React, { useState, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  UserMinus,
  Search,
  Trash2,
  ArrowRightLeft,
  Check,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Textarea } from '../../ui/Textarea';
import { Input } from '../../ui/Input';
import { StudentScoreItem } from '../../../types/inputNilai.types';
import { cn } from '@/lib/utils';
import {
  parsePastedExcelGrades,
  compareGradesWithExcel,
  CompareGradeStatus,
  CompareGradeRowResult,
} from '../../../utils/nilaiExcelCompare';

interface ExcelCompareNilaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: StudentScoreItem[];
  entryMode: 'sumatif' | 'kategori';
  subjectName?: string;
  className?: string;
  kkmThreshold: number;
  onApplyGrades: (updatedScores: StudentScoreItem[]) => void;
}

type FilterTab = 'ALL' | CompareGradeStatus;

export const ExcelCompareNilaiModal: React.FC<ExcelCompareNilaiModalProps> = ({
  isOpen,
  onClose,
  scores,
  entryMode,
  subjectName,
  className: rombelName,
  kkmThreshold,
  onApplyGrades,
}) => {
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [ignoreCaseNama, setIgnoreCaseNama] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  // Parse pasted Excel text
  const parsedExcel = useMemo(
    () => parsePastedExcelGrades(rawText, entryMode),
    [rawText, entryMode]
  );

  // Compare parsed Excel rows against active class students
  const comparison = useMemo(() => {
    if (parsedExcel.rows.length === 0) return null;
    return compareGradesWithExcel(parsedExcel.rows, scores, entryMode, { ignoreCaseNama });
  }, [parsedExcel.rows, scores, entryMode, ignoreCaseNama]);

  // Synchronize selection: by default, all matching students are selected to apply
  React.useEffect(() => {
    if (comparison) {
      const initialKeys = new Set(
        comparison.results
          .filter((r) => r.status === 'COCOK' || r.status === 'NILAI_BERUBAH')
          .map((r) => r.key)
      );
      setSelectedRowKeys(initialKeys);
    } else {
      setSelectedRowKeys(new Set());
    }
  }, [comparison]);

  // Filtered rows for the table view
  const filteredResults = useMemo(() => {
    if (!comparison) return [];
    const q = searchQuery.trim().toLowerCase();
    return comparison.results.filter((row) => {
      if (activeTab !== 'ALL' && row.status !== activeTab) return false;
      if (!q) return true;
      const fields = [
        row.excelRow?.nis,
        row.excelRow?.nama,
        row.systemStudent?.nis,
        row.systemStudent?.nama,
      ];
      return fields.some((f) => (f || '').toLowerCase().includes(q));
    });
  }, [comparison, activeTab, searchQuery]);

  // Toggle single row selection
  const toggleSelectRow = useCallback((key: string) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Toggle select all visible applicable rows
  const selectableVisibleRows = useMemo(
    () => filteredResults.filter((r) => r.status === 'COCOK' || r.status === 'NILAI_BERUBAH'),
    [filteredResults]
  );

  const allVisibleSelected = useMemo(
    () =>
      selectableVisibleRows.length > 0 &&
      selectableVisibleRows.every((r) => selectedRowKeys.has(r.key)),
    [selectableVisibleRows, selectedRowKeys]
  );

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        selectableVisibleRows.forEach((r) => next.delete(r.key));
      } else {
        selectableVisibleRows.forEach((r) => next.add(r.key));
      }
      return next;
    });
  }, [allVisibleSelected, selectableVisibleRows]);

  // Button: Paste from Clipboard
  const handlePasteClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.warning('Clipboard kosong. Silakan salin (Ctrl+C) data dari Excel terlebih dahulu.');
        return;
      }
      setRawText(text);
      toast.success('Data dari clipboard berhasil ditempel!');
    } catch {
      toast.error('Browser memblokir akses clipboard. Silakan klik kotak teks lalu tekan Ctrl + V.');
    }
  }, []);

  // Button: Apply Grades to Score Sheet
  const handleApplySelectedGrades = useCallback(() => {
    if (!comparison || selectedRowKeys.size === 0) {
      toast.warning('Pilih setidaknya satu siswa untuk menerapkan nilai.');
      return;
    }

    // Build update map keyed by siswa_id
    const updatesMap = new Map<string, Partial<StudentScoreItem>>();
    let appliedCount = 0;

    comparison.results.forEach((row) => {
      if (
        (row.status === 'COCOK' || row.status === 'NILAI_BERUBAH') &&
        row.systemStudent &&
        row.excelRow &&
        selectedRowKeys.has(row.key)
      ) {
        const patch: Partial<StudentScoreItem> = {};
        if (entryMode === 'sumatif') {
          if (row.excelRow.sumatif_1 !== undefined) patch.sumatif_1 = row.excelRow.sumatif_1;
          if (row.excelRow.sumatif_2 !== undefined) patch.sumatif_2 = row.excelRow.sumatif_2;
          if (row.excelRow.sumatif_3 !== undefined) patch.sumatif_3 = row.excelRow.sumatif_3;
          if (row.excelRow.sumatif_4 !== undefined) patch.sumatif_4 = row.excelRow.sumatif_4;
          if (row.excelRow.sumatif_akhir !== undefined) patch.sumatif_akhir = row.excelRow.sumatif_akhir;
          if (row.excelRow.deskripsi_cp !== undefined && row.excelRow.deskripsi_cp.trim() !== '') {
            patch.deskripsi_cp = row.excelRow.deskripsi_cp;
          }
        } else {
          if (row.excelRow.nilai !== undefined) patch.nilai = row.excelRow.nilai;
          if (row.excelRow.deskripsi !== undefined && row.excelRow.deskripsi.trim() !== '') {
            patch.deskripsi = row.excelRow.deskripsi;
          }
        }

        updatesMap.set(row.systemStudent.siswa_id, patch);
        appliedCount++;
      }
    });

    if (appliedCount === 0) {
      toast.warning('Tidak ada siswa yang dipilih.');
      return;
    }

    // Apply patches to scores state
    const nextScores = scores.map((st) => {
      if (updatesMap.has(st.siswa_id)) {
        return { ...st, ...updatesMap.get(st.siswa_id) };
      }
      return st;
    });

    onApplyGrades(nextScores);
    toast.success(`Berhasil menerapkan nilai untuk ${appliedCount} siswa ke lembar input!`, {
      icon: '📥',
    });
    onClose();
  }, [comparison, selectedRowKeys, entryMode, scores, onApplyGrades, onClose]);

  // Helper status badge renderer
  const renderStatusBadge = (status: CompareGradeStatus) => {
    switch (status) {
      case 'COCOK':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Cocok
          </Badge>
        );
      case 'NILAI_BERUBAH':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
            Nilai Baru / Berubah
          </Badge>
        );
      case 'HANYA_DI_EXCEL':
        return (
          <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[10px] font-bold">
            <UserPlus className="w-3 h-3 mr-1 text-sky-600" />
            Hanya di Excel
          </Badge>
        );
      case 'BELUM_DINILAI':
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-bold">
            <UserMinus className="w-3 h-3 mr-1 text-rose-600" />
            Belum Ada Nilai
          </Badge>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="6xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              Smart Komparasi & Impor Nilai dari Excel
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {subjectName || 'Mata Pelajaran'} • {rombelName || 'Kelas Rombel'} • {scores.length} Siswa Terdaftar
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Instruction Banner & Column Guide */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed space-y-1">
            <p className="font-bold">
              Solusi Cerdas Anti-Siswa Tertukar:
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Cukup salin rentang kolom dari Excel guru (misal: <strong>NIS / Nama</strong>, dan kolom nilai{' '}
              <strong>Sumatif 1..4, Sum Akhir, CP</strong>), lalu tempelkan di kotak bawah. Sistem otomatis mencocokkan setiap nilai ke siswa yang tepat berdasarkan <strong>NIS</strong> atau <strong>Nama</strong>, sekalipun urutan baris di Excel guru berbeda!
            </p>
          </div>
        </div>

        {/* Area Tempel Excel */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                Tempel Data Nilai dari Excel (Ctrl + V)
              </label>

              {parsedExcel.rows.length > 0 && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                  {parsedExcel.rows.length} baris terbaca
                  {parsedExcel.headerDetected ? ' • Header dilewati' : ''}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePasteClipboard}
                className="rounded-xl text-xs h-8 cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Tempel Clipboard
              </Button>
              {rawText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRawText('');
                    setActiveTab('ALL');
                    setSearchQuery('');
                  }}
                  className="rounded-xl text-xs h-8 text-slate-500 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Bersihkan
                </Button>
              )}
            </div>
          </div>

          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={5}
            placeholder={
              entryMode === 'sumatif'
                ? "Blok kolom dari Excel (NIS, Nama, Sumatif 1, 2, 3, 4, Sum Akhir, CP) -> Copy (Ctrl+C) -> Paste di sini (Ctrl+V).\nContoh:\n26271001\tACHMAD SULTON\t85\t90\t88\t92\t90\tCapaian sangat baik\n26271002\tALIFA AKBAR\t75\t80\t85\t80\t85\tTuntas materi"
                : "Blok kolom dari Excel (NIS, Nama, Nilai, Deskripsi) -> Copy (Ctrl+C) -> Paste di sini (Ctrl+V).\nContoh:\n26271001\tACHMAD SULTON\t85\tSangat aktif dan tuntas\n26271002\tALIFA AKBAR\t78\tCukup baik"
            }
            className="font-mono text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 leading-relaxed"
          />

          {/* Kolom yang Otomatis Dikenali */}
          {parsedExcel.columns.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-500">
              <span className="font-bold text-slate-700 dark:text-slate-300">Kolom Terdeteksi:</span>
              {parsedExcel.columns.map((col) => (
                <span
                  key={col.index}
                  className={cn(
                    'px-2 py-0.5 rounded font-mono font-bold text-[10px] border',
                    col.type === 'NIS' || col.type === 'NAMA'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      : col.type.startsWith('SUMATIF') || col.type === 'NILAI'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : col.type === 'DESKRIPSI_CP' || col.type === 'DESKRIPSI'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  )}
                >
                  {col.label} ({col.type})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Peringatan jika terdeteksi NIS Duplikat di data yang ditempel */}
        {comparison && comparison.summary.duplicateExcelNis.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Peringatan: Terdapat nomor NIS duplikat pada data Excel yang ditempel:</p>
              <p className="font-mono">{comparison.summary.duplicateExcelNis.join(', ')}</p>
            </div>
          </div>
        )}

        {/* HASIL REKONSILIASI & PERBANDINGAN */}
        {parsedExcel.rows.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            Salin data tabel nilai dari Excel lalu tekan <strong>Ctrl + V</strong> pada kotak di atas untuk melihat hasil rekonsiliasi nilai per siswa.
          </div>
        ) : comparison ? (
          <div className="space-y-3">
            {/* Kartu Ringkasan Status */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer',
                  activeTab === 'ALL'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300'
                )}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Total Terbaca
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {comparison.results.length}
                </div>
                <div className="text-[10px] text-slate-500">
                  Excel: {comparison.summary.totalExcel} • Rombel: {comparison.summary.totalSistem}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('COCOK')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer',
                  activeTab === 'COCOK'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-300'
                )}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  Cocok (Sama)
                </div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {comparison.summary.siapTerapkan - comparison.summary.nilaiBerubah}
                </div>
                <div className="text-[10px] text-slate-500">Nilai sudah sama</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('NILAI_BERUBAH')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer',
                  activeTab === 'NILAI_BERUBAH'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-1 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-amber-300'
                )}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                  Nilai Baru / Berubah
                </div>
                <div className="text-lg font-black text-amber-700 dark:text-amber-300">
                  {comparison.summary.nilaiBerubah}
                </div>
                <div className="text-[10px] text-slate-500">Akan diperbarui</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('HANYA_DI_EXCEL')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer',
                  activeTab === 'HANYA_DI_EXCEL'
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-sky-300'
                )}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-sky-600">
                  Hanya di Excel
                </div>
                <div className="text-lg font-black text-sky-700 dark:text-sky-300">
                  {comparison.summary.hanyaDiExcel}
                </div>
                <div className="text-[10px] text-slate-500">Bukan siswa rombel</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('BELUM_DINILAI')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer',
                  activeTab === 'BELUM_DINILAI'
                    ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-1 ring-rose-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-rose-300'
                )}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                  Belum Dinilai
                </div>
                <div className="text-lg font-black text-rose-700 dark:text-rose-300">
                  {comparison.summary.belumDinilai}
                </div>
                <div className="text-[10px] text-slate-500">Tidak ada di Excel</div>
              </button>
            </div>

            {/* Toolbar Pencarian & Opsi */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari siswa atau NIS di hasil..."
                  className="pl-8 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ignoreCaseNama}
                    onChange={(e) => setIgnoreCaseNama(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Toleransi Huruf Besar/Kecil Nama
                </label>
              </div>
            </div>

            {/* TABEL PRATINJAU PERBANDINGAN NILAI */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
              <div className="max-h-[380px] overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          disabled={selectableVisibleRows.length === 0}
                          onChange={toggleSelectAllVisible}
                          aria-label="Pilih semua siswa di tampilan"
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40"
                        />
                      </th>
                      <th className="px-3 py-2.5 w-12 text-center">Baris</th>
                      <th className="px-3 py-2.5 w-28">Status</th>
                      <th className="px-3 py-2.5 min-w-[180px]">Siswa (Nama & NIS)</th>
                      {entryMode === 'sumatif' ? (
                        <>
                          <th className="px-2 py-2.5 text-center w-16">Sum 1</th>
                          <th className="px-2 py-2.5 text-center w-16">Sum 2</th>
                          <th className="px-2 py-2.5 text-center w-16">Sum 3</th>
                          <th className="px-2 py-2.5 text-center w-16">Sum 4</th>
                          <th className="px-2 py-2.5 text-center w-20">Sum Akhir</th>
                          <th className="px-3 py-2.5 min-w-[200px]">Capaian Kompetensi (CP)</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2.5 text-center w-24">Nilai</th>
                          <th className="px-3 py-2.5 min-w-[220px]">Deskripsi</th>
                        </>
                      )}
                      <th className="px-3 py-2.5 w-32">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={entryMode === 'sumatif' ? 11 : 7} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada baris yang sesuai filter saat ini.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((row) => {
                        const isApplicable = row.status === 'COCOK' || row.status === 'NILAI_BERUBAH';
                        const isChecked = selectedRowKeys.has(row.key);

                        return (
                          <tr
                            key={row.key}
                            className={cn(
                              'transition-colors',
                              isChecked && isApplicable
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                                : row.status === 'NILAI_BERUBAH'
                                ? 'bg-amber-50/30 dark:bg-amber-950/10'
                                : row.status === 'HANYA_DI_EXCEL'
                                ? 'bg-sky-50/30 dark:bg-sky-950/10'
                                : row.status === 'BELUM_DINILAI'
                                ? 'bg-rose-50/30 dark:bg-rose-950/10'
                                : ''
                            )}
                          >
                            {/* Checkbox */}
                            <td className="px-3 py-2 text-center align-top">
                              {isApplicable ? (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectRow(row.key)}
                                  aria-label={`Pilih ${row.systemStudent?.nama || 'siswa'}`}
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700 select-none">—</span>
                              )}
                            </td>

                            {/* Baris Excel */}
                            <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-400 align-top">
                              {row.excelRow ? `#${row.excelRow.rowNumber}` : '-'}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2 align-top">{renderStatusBadge(row.status)}</td>

                            {/* Siswa */}
                            <td className="px-3 py-2 align-top">
                              <div className="font-bold text-slate-900 dark:text-white leading-tight">
                                {row.systemStudent?.nama || row.excelRow?.nama || '—'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                NIS: {row.systemStudent?.nis || row.excelRow?.nis || '—'}
                              </div>
                            </td>

                            {/* Kolom Nilai Sumatif / Kategori */}
                            {entryMode === 'sumatif' ? (
                              <>
                                {/* Sumatif 1 */}
                                <td className="px-2 py-2 text-center font-mono text-xs align-top">
                                  {renderScoreCell(
                                    row.systemStudent?.sumatif_1,
                                    row.excelRow?.sumatif_1,
                                    row.diffs.sumatif_1
                                  )}
                                </td>

                                {/* Sumatif 2 */}
                                <td className="px-2 py-2 text-center font-mono text-xs align-top">
                                  {renderScoreCell(
                                    row.systemStudent?.sumatif_2,
                                    row.excelRow?.sumatif_2,
                                    row.diffs.sumatif_2
                                  )}
                                </td>

                                {/* Sumatif 3 */}
                                <td className="px-2 py-2 text-center font-mono text-xs align-top">
                                  {renderScoreCell(
                                    row.systemStudent?.sumatif_3,
                                    row.excelRow?.sumatif_3,
                                    row.diffs.sumatif_3
                                  )}
                                </td>

                                {/* Sumatif 4 */}
                                <td className="px-2 py-2 text-center font-mono text-xs align-top">
                                  {renderScoreCell(
                                    row.systemStudent?.sumatif_4,
                                    row.excelRow?.sumatif_4,
                                    row.diffs.sumatif_4
                                  )}
                                </td>

                                {/* Sumatif Akhir */}
                                <td className="px-2 py-2 text-center font-mono text-xs align-top">
                                  {renderScoreCell(
                                    row.systemStudent?.sumatif_akhir,
                                    row.excelRow?.sumatif_akhir,
                                    row.diffs.sumatif_akhir
                                  )}
                                </td>

                                {/* Capaian Kompetensi */}
                                <td className="px-3 py-2 text-xs align-top leading-relaxed">
                                  {row.excelRow?.deskripsi_cp ? (
                                    <span
                                      className={cn(
                                        row.diffs.deskripsi_cp
                                          ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                                          : 'text-slate-600 dark:text-slate-300'
                                      )}
                                    >
                                      {row.excelRow.deskripsi_cp}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">
                                      {row.systemStudent?.deskripsi_cp || '(Kosong)'}
                                    </span>
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                {/* Nilai Kategori */}
                                <td className="px-3 py-2 text-center font-mono text-xs align-top">
                                  {renderScoreCell(
                                    row.systemStudent?.nilai,
                                    row.excelRow?.nilai,
                                    row.diffs.nilai
                                  )}
                                </td>

                                {/* Deskripsi Kategori */}
                                <td className="px-3 py-2 text-xs align-top leading-relaxed">
                                  {row.excelRow?.deskripsi ? (
                                    <span
                                      className={cn(
                                        row.diffs.deskripsi
                                          ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                                          : 'text-slate-600 dark:text-slate-300'
                                      )}
                                    >
                                      {row.excelRow.deskripsi}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">
                                      {row.systemStudent?.deskripsi || '(Kosong)'}
                                    </span>
                                  )}
                                </td>
                              </>
                            )}

                            {/* Keterangan & Catatan Match */}
                            <td className="px-3 py-2 text-[11px] text-slate-500 align-top">
                              {row.matchMethod && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                  Cocok: {row.matchMethod}
                                </span>
                              )}
                              {row.note && <div className="text-[10px] text-slate-400 mt-0.5">{row.note}</div>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 font-medium">
            {comparison && (
              <span>
                <strong>{selectedRowKeys.size}</strong> siswa dipilih untuk diterapkan ke lembar nilai.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs h-9">
              Batal
            </Button>
            <Button
              type="button"
              disabled={!comparison || selectedRowKeys.size === 0}
              onClick={handleApplySelectedGrades}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 font-bold px-4 shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Nilai ({selectedRowKeys.size})</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Helper to render score cell showing diff if changed
function renderScoreCell(
  sysVal: string | number | null | undefined,
  exVal: number | null | undefined,
  isDiff: boolean
) {
  const cleanSys = sysVal !== null && sysVal !== undefined && sysVal !== '' ? Number(sysVal) : null;
  const cleanEx = exVal !== undefined ? exVal : null;

  if (isDiff && cleanEx !== null) {
    return (
      <div className="flex flex-col items-center">
        <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-1 rounded">
          {cleanEx}
        </span>
        {cleanSys !== null && (
          <span className="text-[9px] text-slate-400 line-through">
            {cleanSys}
          </span>
        )}
      </div>
    );
  }

  const effective = cleanEx !== null ? cleanEx : cleanSys;
  if (effective !== null) {
    return <span className="font-semibold text-slate-700 dark:text-slate-300">{effective}</span>;
  }
  return <span className="text-slate-300 dark:text-slate-700 select-none">-</span>;
}
