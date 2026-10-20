import React, { useMemo } from 'react';
import { Card, Button, SearchableSelect } from '@/components/ui';
import { AcademicContextBar } from '@/components/common';
import { Info, Lock, Save, FileText, Check, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScoreRow } from './types';
import { PklNilaiSidangMobileCards } from './PklNilaiSidangMobileCards';
import { PengujiCombobox } from './PengujiCombobox';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import {
  SpreadsheetGridTable,
  SpreadsheetCellInput,
  useSpreadsheetNavigation,
  type SpreadsheetColumn,
  type SpreadsheetColumnGroup,
} from '@/components/common/SpreadsheetGrid';

const PAGINATION_LIMITS = [10, 25, 50, 100];

export interface PklNilaiSidangTabProps {
  canManageAll: boolean;
  activeGuruId?: string;
  isKaprog: boolean;
  isWaliKelas: boolean;
  walikelasKelas?: { id?: string; nama_kelas?: string } | null;
  allScopedCount: number;
  myGuidanceCountNilai: number;
  guidanceScope: 'ALL' | 'MY_GUIDANCE';
  setGuidanceScope: (scope: 'ALL' | 'MY_GUIDANCE') => void;
  isMobile: boolean;
  statusFilter: 'ALL' | 'AKTIF' | 'SELESAI' | 'ELIGIBLE';
  setStatusFilter: (status: 'ALL' | 'AKTIF' | 'SELESAI' | 'ELIGIBLE') => void;
  selectedTp: string;
  selectedSemester: string;
  setSelectedTp: (tp: string) => void;
  setSelectedSemester: (sem: string) => void;
  tpOptions: { value: string; label: string }[];
  semesterOptions: { value: string; label: string }[];
  isLoadingTp: boolean;
  isLoadingSem: boolean;
  selectedKelas: string;
  setSelectedKelas: (k: string) => void;
  smartClassOptions: { value: string; label: string }[];
  isLoadingRekap: boolean;
  totalRawScores: number;
  isCompositeMode: boolean;
  effectiveSettings?: {
    assessmentMode: 'DUDI_ONLY' | 'COMPOSITE';
    weightDudi: number;
    weightLaporan: number;
    weightSidang: number;
  };
  onSaveBatch: () => void;
  isSavingBatch: boolean;
  displayedScores: ScoreRow[];
  paginatedScores: ScoreRow[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setItemsPerPage: (n: number) => void;
  setCurrentPage: (updater: number | ((prev: number) => number)) => void;
  handleScoreChange: (siswaPklId: string, field: keyof ScoreRow, value: string | number | null) => void;
  onNavigateCetakRapor?: () => void;
  hideFilterCard?: boolean;
}

export const PklNilaiSidangTab: React.FC<PklNilaiSidangTabProps> = ({
  canManageAll,
  activeGuruId,
  isKaprog,
  isWaliKelas,
  walikelasKelas,
  allScopedCount,
  myGuidanceCountNilai,
  guidanceScope,
  setGuidanceScope,
  isMobile,
  statusFilter,
  setStatusFilter,
  selectedTp,
  selectedSemester,
  setSelectedTp,
  setSelectedSemester,
  tpOptions,
  semesterOptions,
  isLoadingTp,
  isLoadingSem,
  selectedKelas,
  setSelectedKelas,
  smartClassOptions,
  isLoadingRekap,
  totalRawScores,
  isCompositeMode,
  effectiveSettings,
  onSaveBatch,
  isSavingBatch,
  displayedScores,
  paginatedScores,
  currentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  handleScoreChange,
  onNavigateCetakRapor,
  hideFilterCard = false,
}) => {
  const { handleKeyDown: handleKeyDownScore } = useSpreadsheetNavigation({
    totalRows: paginatedScores?.length || 0,
    totalCols: 2,
    idPrefix: 'sidang-score',
  });

  const { rawList: rawGuruList, isLoading: isLoadingGuru } = useGuruOptions({
    jenisPtk: 'ALL',
    onlyActive: false,
  });

  const guruList = useMemo(() => {
    return (rawGuruList || []).map((g) => ({
      id: g.id,
      nama_guru: g.nama_guru || '',
      nip: g.nip || null,
    }));
  }, [rawGuruList]);

  const handleApplyPengujiToAll = (namaPenguji: string) => {
    if (!namaPenguji) return;
    (displayedScores || []).forEach((score) => {
      handleScoreChange(score.siswa_pkl_id, 'penguji_nama', namaPenguji);
    });
  };

  const columnGroups = useMemo<SpreadsheetColumnGroup[]>(() => [
    {
      key: 'identitas',
      title: 'Identitas Siswa & Mitra',
      colSpan: 2,
      className: 'bg-slate-100/90 dark:bg-slate-800/90',
    },
    {
      key: 'komponen_nilai',
      title: 'Komponen Nilai Akhir',
      colSpan: 3,
      badge: isCompositeMode ? 'Bobot Gabungan' : 'DUDI 100%',
      className: 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300',
      badgeClassName: isCompositeMode
        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
        : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
    },
    {
      key: 'pelaksanaan',
      title: 'Pelaksanaan Sidang PKL',
      colSpan: 3,
      className: 'bg-slate-100/90 dark:bg-slate-800/90',
    },
    {
      key: 'hasil',
      title: 'Hasil Evaluasi',
      colSpan: 2,
      className: 'bg-slate-100/90 dark:bg-slate-800/90',
    },
  ], [isCompositeMode]);

  const spreadsheetColumns = useMemo<SpreadsheetColumn<ScoreRow>[]>(() => [
    {
      key: 'no',
      header: 'No',
      width: 32,
      align: 'center',
      freeze: 'left',
      freezeOffset: 0,
      renderCell: (_, index) => (
        <span className="font-mono text-[11px] text-slate-400 font-bold">
          {(currentPage - 1) * itemsPerPage + index + 1}
        </span>
      ),
    },
    {
      key: 'siswa',
      header: 'Siswa & Penempatan',
      width: 175,
      freeze: 'left',
      freezeOffset: 32,
      renderCell: (score) => {
        const isAktif = score.status === 'AKTIF' || !score.status;
        const isSelesai = score.status === 'SELESAI';

        return (
          <div className="space-y-0.5 py-0.5 max-w-[170px]">
            {/* Baris 1: NAMA SISWA ,(Kelas), indikator status (dot) */}
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-bold text-slate-900 dark:text-white text-xs truncate" title={score.nama_siswa}>
                {score.nama_siswa}
              </span>
              {score.nama_kelas && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  ({score.nama_kelas})
                </span>
              )}
              {/* Indikator Status Dot */}
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900',
                  isAktif
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                    : isSelesai
                    ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]'
                    : 'bg-slate-400'
                )}
                title={`Status PKL: ${score.status || 'Aktif'}`}
              />
            </div>

            {/* Baris 2: Tempat PKL */}
            <div
              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate flex items-center gap-1"
              title={score.mitra_nama || 'Belum ada tempat PKL'}
            >
              <span className="text-[10px] opacity-75">🏢</span>
              <span className="truncate">{score.mitra_nama || '-'}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'dudi_avg',
      header: 'DUDI',
      subHeader: isCompositeMode ? `${effectiveSettings?.weightDudi ?? 70}%` : '100%',
      width: 50,
      align: 'center',
      renderCell: (score) => {
        const dudiScores = [
          score.hard_kompetensi_teknis,
          score.hard_sop_k3lh,
          score.hard_alur_bisnis,
          score.soft_kedisiplinan,
          score.soft_kerajinan_inisiatif,
          score.soft_kerjasama,
          score.soft_kejujuran,
          score.soft_tanggung_jawab
        ].filter((g): g is number => typeof g === 'number' && g !== null);
        const dAvg = dudiScores.length > 0 ? (dudiScores.reduce((a, b) => a + b, 0) / dudiScores.length).toFixed(1) : null;

        return (
          <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
            {dAvg ?? '-'}
          </span>
        );
      },
    },
    {
      key: 'nilai_laporan',
      header: 'Laporan',
      subHeader: isCompositeMode ? `${effectiveSettings?.weightLaporan ?? 15}%` : 'Arsip',
      width: 52,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`sidang-score-${rowIndex}-0`}
          aria-label={`Nilai laporan ${score.nama_siswa}`}
          value={!isCompositeMode ? null : score.nilai_laporan}
          disabled={!isCompositeMode}
          placeholder={!isCompositeMode ? '-' : '0'}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'nilai_laporan', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 0)}
          className={
            !isCompositeMode
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800'
          }
        />
      ),
    },
    {
      key: 'nilai_sidang',
      header: 'Sidang',
      subHeader: isCompositeMode ? `${effectiveSettings?.weightSidang ?? 15}%` : 'Arsip',
      width: 52,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`sidang-score-${rowIndex}-1`}
          aria-label={`Nilai sidang ${score.nama_siswa}`}
          value={!isCompositeMode ? null : score.nilai_sidang}
          disabled={!isCompositeMode}
          placeholder={!isCompositeMode ? '-' : '0'}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'nilai_sidang', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 1)}
          className={
            !isCompositeMode
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-purple-50/60 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800'
          }
        />
      ),
    },
    {
      key: 'file_portofolio',
      header: 'Berkas',
      width: 68,
      align: 'center',
      renderCell: (score) => score.file_portofolio ? (
        <a
          href={score.file_portofolio}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800"
          title="Buka Portofolio / Berkas Laporan Siswa"
        >
          <FileText size={11} />
          <span>Buka ↗</span>
        </a>
      ) : (
        <span className="text-[10px] text-slate-400 italic">-</span>
      ),
    },
    {
      key: 'penguji_nama',
      header: 'Guru Penguji',
      width: 140,
      renderCell: (score, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
        return (
          <PengujiCombobox
            id={`score-penguji-${globalIndex}`}
            aria-label={`Nama penguji ${score.nama_siswa}`}
            disabled={!isCompositeMode}
            placeholder={!isCompositeMode ? 'Terkunci' : 'Ketik / pilih guru...'}
            value={!isCompositeMode ? '' : (score.penguji_nama || '')}
            onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'penguji_nama', val)}
            guruList={guruList}
            isLoadingGuru={isLoadingGuru}
            size="sm"
            onApplyToAll={handleApplyPengujiToAll}
          />
        );
      },
    },
    {
      key: 'catatan_sidang',
      header: 'Catatan Revisi',
      width: 130,
      renderCell: (score, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
        return (
          <input
            id={`score-catatan-sidang-${globalIndex}`}
            aria-label={`Catatan sidang ${score.nama_siswa}`}
            type="text"
            disabled={!isCompositeMode}
            placeholder={!isCompositeMode ? 'Terkunci' : 'Catatan / revisi...'}
            value={!isCompositeMode ? '' : (score.catatan_sidang || '')}
            onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'catatan_sidang', e.target.value)}
            className={cn(
              'w-full text-[10px] h-6 rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 border',
              !isCompositeMode
                ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400'
            )}
          />
        );
      },
    },
    {
      key: 'nilai_akhir_pkl',
      header: 'Nilai Akhir',
      subHeader: 'Predikat',
      width: 64,
      align: 'center',
      headerClassName: 'text-[10px] font-bold text-center px-0.5 whitespace-normal leading-tight',
      renderCell: (score) => {
        const hasExamined = score.nilai_sidang !== null && score.nilai_sidang !== undefined;
        return (
          <div className="flex flex-col items-center justify-center leading-tight">
            <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
              {score.nilai_akhir_pkl ?? '-'}
            </span>
            <span className="text-[8px] font-bold px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {score.predikat_pkl || (isCompositeMode ? (hasExamined ? 'Gabungan' : 'DUDI') : '100% DUDI')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status_sidang',
      header: 'Status',
      width: 75,
      align: 'center',
      renderCell: (score) => {
        const hasExamined = score.nilai_sidang !== null && score.nilai_sidang !== undefined;
        if (!isCompositeMode) {
          return (
            <span className="text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
              Non-Sidang
            </span>
          );
        }
        if (hasExamined) {
          return Number(score.nilai_sidang) >= 70 ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Check size={9} /> Lulus
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Revisi
            </span>
          );
        }
        return (
          <span className="text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
            Belum
          </span>
        );
      },
    },
  ], [
    currentPage,
    itemsPerPage,
    isCompositeMode,
    effectiveSettings,
    handleScoreChange,
    handleKeyDownScore,
    guruList,
    isLoadingGuru,
    handleApplyPengujiToAll,
  ]);

  return (
    <div className="space-y-4">
      {/* Filter & Action Card */}
      {!hideFilterCard && (
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        {/* Top Scoping & Status Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          {canManageAll && activeGuruId ? (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setGuidanceScope('ALL');
                  setSelectedKelas('');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  guidanceScope === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {isKaprog ? 'Semua Siswa Jurusan' : (isWaliKelas ? `Semua Siswa ${walikelasKelas?.nama_kelas || 'Kelas'}` : 'Semua Siswa PKL')} ({allScopedCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setGuidanceScope('MY_GUIDANCE');
                  setSelectedKelas('');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  guidanceScope === 'MY_GUIDANCE'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Bimbingan / Ujian Saya ({myGuidanceCountNilai})
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">
              Mode: {canManageAll ? 'Administrator Hubin' : 'Guru Penguji / Pembimbing'}
            </span>
          )}

          {/* Status Penempatan Filter */}
          {!isMobile && (
            <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setStatusFilter('ELIGIBLE')}
                className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === 'ELIGIBLE'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Mode Fleksibel: Menampilkan siswa aktif & selesai tanpa duplikat riwayat mutasi (Rekomendasi Penilaian)"
              >
                🎯 Siap Dinilai (Fleksibel)
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('AKTIF')}
                className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === 'AKTIF'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Hanya tampilkan penempatan siswa yang berstatus aktif"
              >
                🟢 Aktif
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SELESAI')}
                className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === 'SELESAI'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Hanya tampilkan siswa yang masa PKL-nya telah selesai/ditarik"
              >
                ✅ Selesai
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Tampilkan semua data penempatan termasuk riwayat mutasi siswa"
              >
                📋 Semua
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
          {/* 1 & 2. Tahun Pelajaran & Semester */}
          <AcademicContextBar
            id="filter-sidang"
            tahunPelajaranId={selectedTp}
            semesterId={selectedSemester}
            onTahunPelajaranChange={setSelectedTp}
            onSemesterChange={setSelectedSemester}
            tpOptions={tpOptions}
            semesterOptions={semesterOptions}
            isLoadingTp={isLoadingTp}
            isLoadingSem={isLoadingSem}
            variant="filter"
            className="contents"
          />

          {/* Filter Kelas */}
          <div>
            <label htmlFor="filter-kelas-sidang" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Filter Kelas Siswa PKL
            </label>
            <SearchableSelect
              id="filter-kelas-sidang"
              aria-label="Pilih kelas sidang"
              value={selectedKelas}
              onValueChange={setSelectedKelas}
              options={[
                { value: '', label: `-- Semua Kelas PKL (${totalRawScores} Siswa) --` },
                ...(smartClassOptions?.map((c) => ({ value: c.value, label: c.label })) || [])
              ]}
              placeholder="Pilih Kelas"
              isLoading={isLoadingRekap}
            />
          </div>

          {/* Info Bobot Penilaian Aktif */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 col-span-1 sm:col-span-2">
            {isCompositeMode ? (
              <>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Info size={14} className="text-indigo-500 shrink-0" />
                  <span>Bobot Penilaian Gabungan Aktif:</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold">
                    DUDI: {effectiveSettings?.weightDudi ?? 70}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Laporan: {effectiveSettings?.weightLaporan ?? 15}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-semibold">
                    Sidang: {effectiveSettings?.weightSidang ?? 15}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                  <Lock size={14} className="text-amber-600 shrink-0" />
                  <span>Skema Aktif: Nilai Industri Murni (100% DUDI)</span>
                </div>
                <p className="mt-0.5 text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-snug">
                  Form input nilai laporan & sidang dinonaktifkan. Nilai akhir rapor 100% dari DUDI. Hubungi Bagian Hubin jika ingin mengaktifkan skema gabungan.
                </p>
              </>
            )}
          </div>
        </div>
      </Card>
      )}

      {/* High-Density Spreadsheet Grid Table (Desktop) vs Mobile Cards (HP) */}
      {isMobile ? (
        <PklNilaiSidangMobileCards
          paginatedScores={paginatedScores || []}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          setCurrentPage={setCurrentPage}
          handleScoreChange={handleScoreChange}
          onSaveBatch={onSaveBatch}
          isSavingBatch={isSavingBatch}
          displayedScoresLength={displayedScores?.length || 0}
          isLoadingRekap={isLoadingRekap}
          isCompositeMode={isCompositeMode}
          effectiveSettings={effectiveSettings}
          guruList={guruList}
          isLoadingGuru={isLoadingGuru}
          onApplyPengujiToAll={handleApplyPengujiToAll}
        />
      ) : (
        <SpreadsheetGridTable<ScoreRow>
          data={paginatedScores || []}
          columns={spreadsheetColumns}
          columnGroups={columnGroups}
          rowKey={(score, index) => score.siswa_pkl_id || `sidang-${index}`}
          isLoading={isLoadingRekap}
          emptyMessage={
            selectedKelas
              ? 'Belum ada data sidang pada kelas yang dipilih.'
              : 'Belum ada data sidang pada periode akademik ini.'
          }
          density="compact"
          enableFullscreen={true}
          autoHeight={true}
          headerTitle="Lembar Penilaian Laporan & Sidang PKL"
          headerActions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                aria-label="Simpan perubahan nilai"
                onClick={onSaveBatch}
                disabled={isSavingBatch || displayedScores?.length === 0 || !isCompositeMode}
                title={!isCompositeMode ? 'Form terkunci karena skema aktif adalah DUDI 100%' : undefined}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none text-xs h-[34px] px-3.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingBatch ? 'Menyimpan...' : (!isCompositeMode ? 'Skema Terkunci' : 'Simpan')}</span>
              </Button>

              {onNavigateCetakRapor && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onNavigateCetakRapor}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl font-bold text-xs h-[34px] px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Buka Lembar Cetak Rapor & Sertifikat PKL"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Cetak Rapor</span>
                </Button>
              )}
            </div>
          }
          footerActions={
            displayedScores?.length > 0 ? (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, displayedScores.length)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-300">{displayedScores.length}</span> Siswa
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="sidang-limit-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Limit:</label>
                    <select 
                      id="sidang-limit-select"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-2xs"
                    >
                      {PAGINATION_LIMITS?.map((limit) => (
                        <option key={limit} value={limit}>{limit} / hal</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-1 border border-slate-200/80 dark:border-slate-800 rounded-xl p-0.5 bg-white dark:bg-slate-900 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Halaman Sebelumnya"
                    className="h-6 px-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                  >
                    Prev
                  </button>
                  <div className="px-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-900/40" aria-current="page">
                    {currentPage} / {totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Halaman Selanjutnya"
                    className="h-6 px-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
};

export default PklNilaiSidangTab;
