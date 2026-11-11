import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  UserMinus,
  Download,
  Search,
  Trash2,
  RefreshCw,
  ArrowRightLeft,
  Check,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import toast from 'react-hot-toast';

import { Modal, Button, Badge, Textarea, Input, Loader } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { getSiswaList, updateSiswa } from '../../../api/academic/siswa.api';
import type { Kelas, Siswa } from '../../../types/academic';
import {
  parsePastedExcelText,
  compareKelasWithExcel,
  type ExcelCompareColumnOrder,
  type CompareResultStatus,
  type CompareRowResult
} from '../../../utils/siswaExcelCompare';

interface ExcelCompareKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasList: Kelas[];
  initialKelasId?: string;
  isKelasDisabled?: boolean;
  jurusanId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  canEdit?: boolean;
  onDataUpdated?: () => void;
}

const COLUMN_ORDER_OPTIONS: { label: string; value: ExcelCompareColumnOrder }[] = [
  { label: 'NISN → NIS → NAMA', value: 'NISN_NIS_NAMA' },
  { label: 'NIS → NISN → NAMA', value: 'NIS_NISN_NAMA' },
  { label: 'NAMA → NISN → NIS', value: 'NAMA_NISN_NIS' },
];

type FilterTab = 'ALL' | CompareResultStatus;

export const ExcelCompareKelasModal: React.FC<ExcelCompareKelasModalProps> = ({
  isOpen,
  onClose,
  kelasList,
  initialKelasId = '',
  isKelasDisabled = false,
  jurusanId = '',
  tahunPelajaranId = '',
  semesterId = '',
  canEdit = false,
  onDataUpdated,
}) => {
  const [selectedKelasId, setSelectedKelasId] = useState(initialKelasId);
  const [columnOrder, setColumnOrder] = useState<ExcelCompareColumnOrder>('NISN_NIS_NAMA');
  const [rawText, setRawText] = useState('');
  const [onlyAktif, setOnlyAktif] = useState(true);
  const [ignoreCaseNama, setIgnoreCaseNama] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchResult, setSearchResult] = useState('');
  const [syncingKey, setSyncingKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialKelasId) {
      setSelectedKelasId(initialKelasId);
    }
  }, [isOpen, initialKelasId]);

  const selectedKelasObj = useMemo(
    () => kelasList.find((k) => k.id === selectedKelasId),
    [kelasList, selectedKelasId]
  );

  const kelasOptions = useMemo(
    () =>
      kelasList.map((k) => ({
        label: `${k.nama_kelas} (Tingkat ${k.tingkat})`,
        value: k.id,
      })),
    [kelasList]
  );

  const {
    data: kelasSiswaRes,
    isLoading: isLoadingSiswa,
    isFetching: isFetchingSiswa,
    refetch: refetchKelasSiswa,
  } = useQuery({
    queryKey: [
      'siswa',
      'excel-compare-kelas',
      selectedKelasId,
      onlyAktif ? 'AKTIF' : 'ALL',
      jurusanId,
      tahunPelajaranId,
      semesterId,
    ],
    queryFn: () =>
      getSiswaList(
        1,
        500,
        '',
        selectedKelasId,
        onlyAktif ? 'AKTIF' : '',
        '',
        '',
        '',
        jurusanId,
        tahunPelajaranId,
        semesterId
      ),
    enabled: isOpen && Boolean(selectedKelasId),
    staleTime: 60 * 1000,
  });

  const dbStudents: Siswa[] = useMemo(() => kelasSiswaRes?.data || [], [kelasSiswaRes]);

  const parsedExcel = useMemo(
    () => parsePastedExcelText(rawText, columnOrder),
    [rawText, columnOrder]
  );

  const comparison = useMemo(() => {
    if (!selectedKelasId || parsedExcel.rows.length === 0) return null;
    return compareKelasWithExcel(parsedExcel.rows, dbStudents, { ignoreCaseNama });
  }, [selectedKelasId, parsedExcel.rows, dbStudents, ignoreCaseNama]);

  const filteredResults = useMemo(() => {
    if (!comparison) return [];
    const q = searchResult.trim().toLowerCase();
    return comparison.results.filter((row) => {
      if (activeTab !== 'ALL' && row.status !== activeTab) return false;
      if (!q) return true;
      const fields = [
        row.excelRow?.nisn,
        row.excelRow?.nis,
        row.excelRow?.nama,
        row.siswa?.nisn,
        row.siswa?.nis,
        row.siswa?.nama_siswa,
      ];
      return fields.some((f) => (f || '').toLowerCase().includes(q));
    });
  }, [comparison, activeTab, searchResult]);

  const handlePasteClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast('Clipboard kosong.', { icon: '⚠️' });
        return;
      }
      setRawText(text);
      toast.success('Data dari clipboard berhasil ditempel.');
    } catch {
      toast.error('Browser memblokir akses clipboard. Silakan klik kotak teks lalu tekan Ctrl+V.');
    }
  }, []);

  const handleSyncRowToSystem = useCallback(
    async (row: CompareRowResult) => {
      if (!canEdit || !row.siswa || !row.excelRow) return;
      const payload: Partial<Siswa> = {};
      if (row.diffs.nisn && row.excelRow.nisn) payload.nisn = row.excelRow.nisn;
      if (row.diffs.nis && row.excelRow.nis) payload.nis = row.excelRow.nis;
      if (row.diffs.nama && row.excelRow.nama) payload.nama_siswa = row.excelRow.nama;

      if (Object.keys(payload).length === 0) {
        toast('Tidak ada nilai non-kosong di Excel untuk diterapkan.', { icon: '⚠️' });
        return;
      }

      try {
        setSyncingKey(row.key);
        const res = await updateSiswa(row.siswa.id, payload);
        if (!res.success) {
          toast.error(res.message || 'Gagal memperbarui data siswa.');
          return;
        }
        toast.success(`Data ${row.siswa.nama_siswa} disesuaikan dengan Excel.`);
        await refetchKelasSiswa();
        onDataUpdated?.();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Gagal menyimpan pembaruan siswa.');
      } finally {
        setSyncingKey(null);
      }
    },
    [canEdit, refetchKelasSiswa, onDataUpdated]
  );

  const handleExportReport = useCallback(() => {
    if (!comparison) return;

    const statusLabelMap: Record<CompareResultStatus, string> = {
      COCOK: 'Cocok',
      BEDA_DATA: 'Ada Perbedaan',
      HANYA_DI_EXCEL: 'Hanya di Excel',
      HANYA_DI_SISTEM: 'Hanya di Sistem',
    };

    const rows = comparison.results.map((r, idx) => {
      const diffParts: string[] = [];
      if (r.diffs.nisn) diffParts.push(r.diffs.leadingZeroNisn ? 'NISN beda nol depan' : 'NISN beda');
      if (r.diffs.nis) diffParts.push(r.diffs.leadingZeroNis ? 'NIS beda nol depan' : 'NIS beda');
      if (r.diffs.nama) diffParts.push('Nama beda');
      if (r.note) diffParts.push(r.note);

      return [
        idx + 1,
        statusLabelMap[r.status],
        r.excelRow?.rowNumber ?? '-',
        r.excelRow?.nisn || '-',
        r.siswa?.nisn || '-',
        r.excelRow?.nis || '-',
        r.siswa?.nis || '-',
        r.excelRow?.nama || '-',
        r.siswa?.nama_siswa || '-',
        diffParts.join('; ') || (r.status === 'COCOK' ? 'Sesuai' : '-'),
      ];
    });

    const kelasTitle = selectedKelasObj?.nama_kelas || 'Kelas';
    const sheetData = [
      [`LAPORAN CEK PERBANDINGAN DATA KELAS (${kelasTitle.toUpperCase()})`],
      [
        `Total Excel: ${comparison.summary.totalExcel} | Total Sistem: ${comparison.summary.totalSistem} | Cocok: ${comparison.summary.cocok} | Beda: ${comparison.summary.bedaData} | Hanya Excel: ${comparison.summary.hanyaDiExcel} | Hanya Sistem: ${comparison.summary.hanyaDiSistem}`,
      ],
      [],
      [
        'No',
        'Status',
        'Baris Excel',
        'NISN (Excel)',
        'NISN (Sistem)',
        'NIS (Excel)',
        'NIS (Sistem)',
        'Nama (Excel)',
        'Nama (Sistem)',
        'Keterangan',
      ],
      ...rows,
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 16 },
      { wch: 11 },
      { wch: 15 },
      { wch: 15 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 28 },
      { wch: 34 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Cek Kelas');

    const safeClass = kelasTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Cek_Excel_${safeClass}_${stamp}.xlsx`);
    toast.success('Laporan hasil perbandingan berhasil diekspor.');
  }, [comparison, selectedKelasObj]);

  const renderStatusBadge = (status: CompareResultStatus) => {
    switch (status) {
      case 'COCOK':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Cocok
          </Badge>
        );
      case 'BEDA_DATA':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Beda Data
          </Badge>
        );
      case 'HANYA_DI_EXCEL':
        return (
          <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800">
            <UserPlus className="w-3 h-3 mr-1" />
            Hanya di Excel
          </Badge>
        );
      case 'HANYA_DI_SISTEM':
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800">
            <UserMinus className="w-3 h-3 mr-1" />
            Hanya di Sistem
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
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              Cek & Bandingkan Data Kelas dengan Excel
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Salin 3 kolom (NISN, NIS, Nama) dari Excel lalu tempel di sini untuk mencocokkan isi 1 kelas.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Konfigurasi Kelas & Urutan Kolom */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Pilih Kelas Pembanding
            </label>
            <SearchableSelect
              value={selectedKelasId}
              onValueChange={(val) => {
                setSelectedKelasId(val);
                setActiveTab('ALL');
              }}
              options={kelasOptions}
              placeholder="Pilih kelas yang akan dicek..."
              searchPlaceholder="Cari nama kelas..."
              disabled={isKelasDisabled}
              triggerClassName="h-10 rounded-xl text-xs font-bold bg-white dark:bg-slate-950"
            />
            {selectedKelasId && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                {isLoadingSiswa || isFetchingSiswa ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                    Memuat daftar siswa kelas...
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>
                      <strong>{dbStudents.length}</strong> siswa{' '}
                      {onlyAktif ? 'aktif ' : ''}terdaftar di sistem untuk kelas{' '}
                      <strong>{selectedKelasObj?.nama_kelas || ''}</strong>
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Urutan 3 Kolom dari Excel
            </label>
            <SearchableSelect
              value={columnOrder}
              onValueChange={(val) => setColumnOrder(val as ExcelCompareColumnOrder)}
              options={COLUMN_ORDER_OPTIONS}
              placeholder="Urutan kolom..."
              disabled={parsedExcel.headerDetected}
              triggerClassName="h-10 rounded-xl text-xs font-bold bg-white dark:bg-slate-950"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {parsedExcel.headerDetected
                ? 'Header kolom otomatis terdeteksi dari baris pertama.'
                : 'Jika baris pertama berisi judul kolom (NISN / NIS / Nama), urutan dideteksi otomatis.'}
            </p>
          </div>

          <div className="md:col-span-3 flex flex-col justify-center gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAktif}
                onChange={(e) => setOnlyAktif(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Hanya siswa berstatus AKTIF
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ignoreCaseNama}
                onChange={(e) => setIgnoreCaseNama(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Abaikan huruf besar/kecil Nama
            </label>
          </div>
        </div>

        {/* Area Paste Excel */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                3. Tempel Data dari Excel (Ctrl+V)
              </label>
              {parsedExcel.rows.length > 0 && (
                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px]">
                  {parsedExcel.rows.length} baris terbaca
                  {parsedExcel.headerDetected ? ' • Header dilewati' : ''}
                  {parsedExcel.skippedNoColumn ? ' • Kolom No diabaikan' : ''}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePasteClipboard}
                className="rounded-xl text-xs h-8"
              >
                <ClipboardPaste className="w-3.5 h-3.5 mr-1.5" />
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
                    setSearchResult('');
                  }}
                  className="rounded-xl text-xs h-8 text-slate-500 hover:text-rose-600"
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
              "Blok 3 kolom (NISN, NIS, Nama) di Excel -> Copy (Ctrl+C) -> Paste di sini (Ctrl+V).\nContoh:\n0081234567\t24251001\tAHMAD FAUZAN\n0087654321\t24251002\tSITI AISYAH"
            }
            className="font-mono text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 leading-relaxed"
          />
        </div>

        {/* Peringatan Duplikat di Excel / Sistem */}
        {comparison &&
          (comparison.summary.duplicateExcelNisn.length > 0 ||
            comparison.summary.duplicateExcelNis.length > 0) && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Terdeteksi nomor ganda pada data Excel yang ditempel:</p>
                {comparison.summary.duplicateExcelNisn.length > 0 && (
                  <p>NISN duplikat: {comparison.summary.duplicateExcelNisn.join(', ')}</p>
                )}
                {comparison.summary.duplicateExcelNis.length > 0 && (
                  <p>NIS duplikat: {comparison.summary.duplicateExcelNis.join(', ')}</p>
                )}
              </div>
            </div>
          )}

        {/* Hasil Perbandingan */}
        {!selectedKelasId ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            Pilih salah satu <strong>Kelas</strong> di atas untuk memuat daftar siswa pembanding.
          </div>
        ) : isLoadingSiswa ? (
          <div className="p-10 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
            <Loader size="md" />
            <span>Mengambil data siswa kelas dari sistem...</span>
          </div>
        ) : parsedExcel.rows.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            Tempelkan baris data dari Excel pada kotak di atas untuk melihat hasil pencocokan secara langsung.
          </div>
        ) : comparison ? (
          <div className="space-y-3">
            {/* Ringkasan & Filter Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Total Dicek
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {comparison.results.length}
                </div>
                <div className="text-[10px] text-slate-500">
                  Excel {comparison.summary.totalExcel} • Sistem {comparison.summary.totalSistem}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('COCOK')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'COCOK'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-300'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  Cocok 100%
                </div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {comparison.summary.cocok}
                </div>
                <div className="text-[10px] text-slate-500">NISN, NIS & Nama sama</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('BEDA_DATA')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'BEDA_DATA'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-1 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-amber-300'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                  Beda Data
                </div>
                <div className="text-lg font-black text-amber-700 dark:text-amber-300">
                  {comparison.summary.bedaData}
                </div>
                <div className="text-[10px] text-slate-500">Ada kolom tidak cocok</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('HANYA_DI_EXCEL')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'HANYA_DI_EXCEL'
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-sky-300'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-sky-600">
                  Hanya di Excel
                </div>
                <div className="text-lg font-black text-sky-700 dark:text-sky-300">
                  {comparison.summary.hanyaDiExcel}
                </div>
                <div className="text-[10px] text-slate-500">Belum ada di kelas sistem</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('HANYA_DI_SISTEM')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'HANYA_DI_SISTEM'
                    ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-1 ring-rose-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-rose-300'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                  Hanya di Sistem
                </div>
                <div className="text-lg font-black text-rose-700 dark:text-rose-300">
                  {comparison.summary.hanyaDiSistem}
                </div>
                <div className="text-[10px] text-slate-500">Tidak ada di daftar Excel</div>
              </button>
            </div>

            {/* Toolbar Hasil: Cari & Ekspor */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchResult}
                  onChange={(e) => setSearchResult(e.target.value)}
                  placeholder="Cari nama, NIS, atau NISN di hasil..."
                  className="pl-8 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetchKelasSiswa()}
                  disabled={isFetchingSiswa}
                  className="rounded-xl text-xs h-9"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetchingSiswa ? 'animate-spin' : ''}`} />
                  Muat Ulang Kelas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportReport}
                  className="rounded-xl text-xs h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Ekspor Hasil (.xlsx)
                </Button>
              </div>
            </div>

            {/* Tabel Hasil Perbandingan */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
              <div className="max-h-[380px] overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2.5 w-14">Baris</th>
                      <th className="px-3 py-2.5 w-32">Status</th>
                      <th className="px-3 py-2.5">NISN (Excel vs Sistem)</th>
                      <th className="px-3 py-2.5">NIS (Excel vs Sistem)</th>
                      <th className="px-3 py-2.5">Nama Siswa (Excel vs Sistem)</th>
                      <th className="px-3 py-2.5 w-48">Keterangan / Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada baris yang sesuai filter saat ini.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((row) => {
                        const diffTags: string[] = [];
                        if (row.diffs.nisn) diffTags.push(row.diffs.leadingZeroNisn ? 'NISN beda nol depan' : 'NISN beda');
                        if (row.diffs.nis) diffTags.push(row.diffs.leadingZeroNis ? 'NIS beda nol depan' : 'NIS beda');
                        if (row.diffs.nama) diffTags.push('Nama beda');

                        const canQuickSync =
                          canEdit &&
                          row.status === 'BEDA_DATA' &&
                          Boolean(row.siswa && row.excelRow) &&
                          ((row.diffs.nisn && Boolean(row.excelRow?.nisn)) ||
                            (row.diffs.nis && Boolean(row.excelRow?.nis)) ||
                            (row.diffs.nama && Boolean(row.excelRow?.nama)));

                        return (
                          <tr
                            key={row.key}
                            className={
                              row.status === 'BEDA_DATA'
                                ? 'bg-amber-50/40 dark:bg-amber-950/10'
                                : row.status === 'HANYA_DI_EXCEL'
                                ? 'bg-sky-50/40 dark:bg-sky-950/10'
                                : row.status === 'HANYA_DI_SISTEM'
                                ? 'bg-rose-50/40 dark:bg-rose-950/10'
                                : ''
                            }
                          >
                            <td className="px-3 py-2.5 font-mono text-slate-500 align-top">
                              {row.excelRow ? `#${row.excelRow.rowNumber}` : '-'}
                            </td>
                            <td className="px-3 py-2.5 align-top">{renderStatusBadge(row.status)}</td>

                            {/* NISN */}
                            <td className="px-3 py-2.5 font-mono align-top">
                              {row.status === 'COCOK' ? (
                                <span className="text-slate-800 dark:text-slate-200">
                                  {row.excelRow?.nisn || row.siswa?.nisn || <span className="text-slate-400">(kosong)</span>}
                                </span>
                              ) : row.status === 'HANYA_DI_EXCEL' ? (
                                <span className="text-sky-700 dark:text-sky-300 font-semibold">
                                  {row.excelRow?.nisn || <span className="text-slate-400">(kosong)</span>}
                                </span>
                              ) : row.status === 'HANYA_DI_SISTEM' ? (
                                <span className="text-rose-700 dark:text-rose-300 font-semibold">
                                  {row.siswa?.nisn || <span className="text-slate-400">(kosong)</span>}
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className={row.diffs.nisn ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                                    <span className="text-[10px] font-sans uppercase text-slate-400 mr-1">Ex:</span>
                                    {row.excelRow?.nisn || <span className="text-slate-400 italic">(kosong)</span>}
                                  </div>
                                  {row.diffs.nisn && (
                                    <div className="text-rose-600 dark:text-rose-400">
                                      <span className="text-[10px] font-sans uppercase text-slate-400 mr-1">Sis:</span>
                                      {row.siswa?.nisn || <span className="text-slate-400 italic">(kosong)</span>}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* NIS */}
                            <td className="px-3 py-2.5 font-mono align-top">
                              {row.status === 'COCOK' ? (
                                <span className="text-slate-800 dark:text-slate-200">
                                  {row.excelRow?.nis || row.siswa?.nis || <span className="text-slate-400">(kosong)</span>}
                                </span>
                              ) : row.status === 'HANYA_DI_EXCEL' ? (
                                <span className="text-sky-700 dark:text-sky-300 font-semibold">
                                  {row.excelRow?.nis || <span className="text-slate-400">(kosong)</span>}
                                </span>
                              ) : row.status === 'HANYA_DI_SISTEM' ? (
                                <span className="text-rose-700 dark:text-rose-300 font-semibold">
                                  {row.siswa?.nis || <span className="text-slate-400">(kosong)</span>}
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className={row.diffs.nis ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                                    <span className="text-[10px] font-sans uppercase text-slate-400 mr-1">Ex:</span>
                                    {row.excelRow?.nis || <span className="text-slate-400 italic">(kosong)</span>}
                                  </div>
                                  {row.diffs.nis && (
                                    <div className="text-rose-600 dark:text-rose-400">
                                      <span className="text-[10px] font-sans uppercase text-slate-400 mr-1">Sis:</span>
                                      {row.siswa?.nis || <span className="text-slate-400 italic">(kosong)</span>}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Nama */}
                            <td className="px-3 py-2.5 align-top">
                              {row.status === 'COCOK' ? (
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {row.siswa?.nama_siswa || row.excelRow?.nama}
                                  </span>
                                  {row.diffs.caseOnlyNama && (
                                    <div className="text-[10px] text-slate-400">
                                      Excel: {row.excelRow?.nama} (beda kapitalisasi)
                                    </div>
                                  )}
                                </div>
                              ) : row.status === 'HANYA_DI_EXCEL' ? (
                                <span className="font-semibold text-sky-800 dark:text-sky-300">
                                  {row.excelRow?.nama || <span className="text-slate-400">(kosong)</span>}
                                </span>
                              ) : row.status === 'HANYA_DI_SISTEM' ? (
                                <span className="font-semibold text-rose-800 dark:text-rose-300">
                                  {row.siswa?.nama_siswa}
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className={row.diffs.nama ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'font-semibold text-slate-800 dark:text-slate-200'}>
                                    <span className="text-[10px] uppercase text-slate-400 mr-1">Ex:</span>
                                    {row.excelRow?.nama || <span className="text-slate-400 italic">(kosong)</span>}
                                  </div>
                                  {row.diffs.nama && (
                                    <div className="text-rose-600 dark:text-rose-400 font-medium">
                                      <span className="text-[10px] uppercase text-slate-400 mr-1">Sis:</span>
                                      {row.siswa?.nama_siswa || <span className="text-slate-400 italic">(kosong)</span>}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Keterangan & Quick Sync */}
                            <td className="px-3 py-2.5 align-top space-y-1.5">
                              {diffTags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {diffTags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[10px] font-bold"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {row.note && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                  {row.note}
                                </p>
                              )}
                              {row.status === 'COCOK' && !row.note && (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  Sesuai (via {row.matchMethod})
                                </span>
                              )}
                              {canQuickSync && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={syncingKey === row.key}
                                  onClick={() => handleSyncRowToSystem(row)}
                                  className="h-7 px-2 text-[11px] rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
                                >
                                  {syncingKey === row.key ? (
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3 mr-1" />
                                  )}
                                  Ikuti Data Excel
                                </Button>
                              )}
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
      </div>
    </Modal>
  );
};
