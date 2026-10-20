import React, { useMemo } from 'react';
import { Card, Button, SearchableSelect } from '@/components/ui';
import { AcademicContextBar } from '@/components/common';
import { Save, RotateCcw, Copy, Printer } from 'lucide-react';
import { ScoreRow } from './types';
import {
  SpreadsheetGridTable,
  SpreadsheetCellInput,
  useSpreadsheetNavigation,
  type SpreadsheetColumn,
  type SpreadsheetColumnGroup,
} from '@/components/common/SpreadsheetGrid';

const PAGINATION_LIMITS = [10, 25, 50, 100];

export interface PklNilaiIndustriTabProps {
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
  onOpenPasteModal?: () => void;
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
  handleApplyToSameMitra: (mitraNama: string, instruktur: string, pic: string) => void;
  handleSyncFromDailyAttendance: () => void;
  onPrintSertifikat?: (row: ScoreRow) => void;
  onNavigateCetakRapor?: () => void;
  hideFilterCard?: boolean;
}

export const PklNilaiIndustriTab: React.FC<PklNilaiIndustriTabProps> = ({
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
  onOpenPasteModal,
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
  handleApplyToSameMitra,
  handleSyncFromDailyAttendance,
  onNavigateCetakRapor,
  hideFilterCard = false,
}) => {
  const { handleKeyDown: handleKeyDownScore } = useSpreadsheetNavigation({
    totalRows: paginatedScores?.length || 0,
    totalCols: 8,
    idPrefix: 'score-input',
  });

  const columnGroups = useMemo<SpreadsheetColumnGroup[]>(() => [
    {
      key: 'identitas',
      title: 'Identitas Siswa & Mitra',
      colSpan: 3,
      className: 'bg-slate-100/90 dark:bg-slate-800/90',
    },
    {
      key: 'hard-skill',
      title: 'Hard Skill (3 Aspek)',
      colSpan: 3,
      badge: 'Bobot 70%',
      className: 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300',
      badgeClassName: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    },
    {
      key: 'soft-skill',
      title: 'Soft Skill (5 Aspek)',
      colSpan: 5,
      badge: 'Bobot 30%',
      className: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
      badgeClassName: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
    },
    {
      key: 'evaluasi',
      title: 'Hasil Evaluasi & Presensi',
      colSpan: 3,
      className: 'bg-slate-100/90 dark:bg-slate-800/90',
    },
  ], []);

  const spreadsheetColumns = useMemo<SpreadsheetColumn<ScoreRow>[]>(() => [
    {
      key: 'no',
      header: 'No',
      width: 32,
      align: 'center',
      freeze: 'left',
      freezeOffset: 0,
      renderCell: (_row, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
        return <span className="font-mono font-bold text-slate-400 text-[10px]">{globalIndex}</span>;
      },
    },
    {
      key: 'siswa',
      header: 'Siswa & Penempatan',
      width: 165,
      freeze: 'left',
      freezeOffset: 32,
      renderCell: (score) => (
        <div className="space-y-0.5 py-0.5 max-w-[160px]">
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[125px]" title={score.nama_siswa}>
              {score.nama_siswa}
            </span>
            {score.status === 'SELESAI' ? (
              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900 leading-none">
                Selesai
              </span>
            ) : score.status === 'AKTIF' ? (
              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 leading-none">
                Aktif
              </span>
            ) : null}
          </div>
          <div className="text-[9px] text-slate-500 font-mono truncate max-w-[155px]" title={`${score.nis || '-'} • ${score.nama_kelas || '-'} • ${score.mitra_nama || '-'}`}>
            {score.nama_kelas || '-'} • 🏢 <span className="font-semibold text-indigo-600 dark:text-indigo-400">{score.mitra_nama || '-'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'instruktur_pic',
      header: 'Instruktur',
      subHeader: 'DUDI / PIC',
      width: 105,
      renderCell: (score, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
        return (
          <div className="space-y-0.5 py-0.5 max-w-[100px]">
            <input
              id={`score-instruktur-${globalIndex}`}
              aria-label={`Nama instruktur ${score.nama_siswa}`}
              type="text"
              placeholder="Instruktur..."
              value={score.instruktur_nama || ''}
              onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'instruktur_nama', e.target.value)}
              className="w-full text-[10px] h-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-0.5">
              <input
                id={`score-pic-${globalIndex}`}
                aria-label={`Penanggung jawab DUDI ${score.nama_siswa}`}
                type="text"
                placeholder="PIC DUDI..."
                value={score.penanggung_jawab_nama || ''}
                onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'penanggung_jawab_nama', e.target.value)}
                className="w-full text-[9px] h-4.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1 text-slate-600 dark:text-slate-400 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {score.mitra_nama && score.instruktur_nama && (
                <button
                  type="button"
                  onClick={() => handleApplyToSameMitra(score.mitra_nama, score.instruktur_nama, score.penanggung_jawab_nama)}
                  className="shrink-0 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                  title={`Salin ke semua siswa ${score.mitra_nama}`}
                >
                  <Copy size={10} />
                </button>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'hard_kompetensi_teknis',
      header: 'Tek',
      subHeader: 'Hard',
      width: 44,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`score-input-${rowIndex}-0`}
          aria-label={`Nilai teknis ${score.nama_siswa}`}
          value={score.hard_kompetensi_teknis}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'hard_kompetensi_teknis', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 0)}
          className="bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800"
        />
      ),
    },
    {
      key: 'hard_sop_k3lh',
      header: 'K3',
      subHeader: 'Hard',
      width: 44,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`score-input-${rowIndex}-1`}
          aria-label={`Nilai SOP K3LH ${score.nama_siswa}`}
          value={score.hard_sop_k3lh}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'hard_sop_k3lh', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 1)}
          className="bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800"
        />
      ),
    },
    {
      key: 'hard_alur_bisnis',
      header: 'Bis',
      subHeader: 'Hard',
      width: 44,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`score-input-${rowIndex}-2`}
          aria-label={`Nilai alur bisnis ${score.nama_siswa}`}
          value={score.hard_alur_bisnis}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'hard_alur_bisnis', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 2)}
          className="bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800"
        />
      ),
    },
    {
      key: 'soft_kedisiplinan',
      header: 'Dis',
      subHeader: 'Soft',
      width: 44,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`score-input-${rowIndex}-3`}
          aria-label={`Nilai kedisiplinan ${score.nama_siswa}`}
          value={score.soft_kedisiplinan}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'soft_kedisiplinan', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 3)}
          className="bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800"
        />
      ),
    },
    {
      key: 'soft_kerajinan_inisiatif',
      header: 'Ini',
      subHeader: 'Soft',
      width: 44,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`score-input-${rowIndex}-4`}
          aria-label={`Nilai inisiatif ${score.nama_siswa}`}
          value={score.soft_kerajinan_inisiatif}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'soft_kerajinan_inisiatif', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 4)}
          className="bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800"
        />
      ),
    },
    {
      key: 'soft_kerjasama',
      header: 'Ker',
      subHeader: 'Soft',
      width: 44,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`score-input-${rowIndex}-5`}
          aria-label={`Nilai kerjasama ${score.nama_siswa}`}
          value={score.soft_kerjasama}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'soft_kerjasama', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 5)}
          className="bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800"
        />
      ),
    },
    {
      key: 'soft_kejujuran',
      header: 'Juj',
      subHeader: 'Soft',
      width: 44,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`score-input-${rowIndex}-6`}
          aria-label={`Nilai kejujuran ${score.nama_siswa}`}
          value={score.soft_kejujuran}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'soft_kejujuran', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 6)}
          className="bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800"
        />
      ),
    },
    {
      key: 'soft_tanggung_jawab',
      header: 'Tgg',
      subHeader: 'Soft',
      width: 44,
      align: 'center',
      renderCell: (score, rowIndex) => (
        <SpreadsheetCellInput
          id={`score-input-${rowIndex}-7`}
          aria-label={`Nilai tanggung jawab ${score.nama_siswa}`}
          value={score.soft_tanggung_jawab}
          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'soft_tanggung_jawab', val)}
          onKeyDown={(e) => handleKeyDownScore(e, rowIndex, 7)}
          className="bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800"
        />
      ),
    },
    {
      key: 'nilai_akhir_pkl',
      header: 'Akhir',
      subHeader: 'Nilai/Pred',
      width: 60,
      align: 'center',
      renderCell: (score) => (
        <div className="flex flex-col items-center justify-center leading-tight">
          <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
            {score.nilai_akhir_pkl ?? '-'}
          </span>
          <span className="text-[8px] font-bold px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {score.predikat_pkl || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'presensi_pkl',
      header: (
        <div className="flex items-center justify-center gap-0.5">
          <span>Presensi</span>
          <button
            type="button"
            onClick={handleSyncFromDailyAttendance}
            className="p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
            title="Tarik S/I/A harian"
          >
            <RotateCcw size={10} />
          </button>
        </div>
      ),
      subHeader: 'S / I / A',
      width: 84,
      align: 'center',
      renderCell: (score, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
        return (
          <div className="inline-flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800/80 p-0.5 rounded border border-slate-200 dark:border-slate-700/80">
            <input
              id={`score-sakit-${globalIndex}`}
              aria-label={`Sakit ${score.nama_siswa}`}
              type="number" min={0} max={365} placeholder="0"
              value={score.sakit_pkl || ''}
              onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'sakit_pkl', e.target.value)}
              className="w-5.5 h-5 text-[9px] font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Sakit"
            />
            <input
              id={`score-izin-${globalIndex}`}
              aria-label={`Izin ${score.nama_siswa}`}
              type="number" min={0} max={365} placeholder="0"
              value={score.izin_pkl || ''}
              onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'izin_pkl', e.target.value)}
              className="w-5.5 h-5 text-[9px] font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Izin"
            />
            <input
              id={`score-alpa-${globalIndex}`}
              aria-label={`Alpa ${score.nama_siswa}`}
              type="number" min={0} max={365} placeholder="0"
              value={score.alpa_pkl || ''}
              onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'alpa_pkl', e.target.value)}
              className="w-5.5 h-5 text-[9px] font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Alpa"
            />
          </div>
        );
      },
    },
    {
      key: 'catatan_pkl',
      header: 'Catatan',
      subHeader: 'Evaluasi',
      width: 120,
      renderCell: (score, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
        return (
          <input
            id={`score-cat-${globalIndex}`}
            aria-label={`Catatan evaluasi ${score.nama_siswa}`}
            type="text"
            placeholder="Catatan..."
            value={score.catatan_pkl || ''}
            onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'catatan_pkl', e.target.value)}
            className="w-full text-[10px] h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        );
      },
    },
  ], [
    currentPage,
    itemsPerPage,
    handleScoreChange,
    handleApplyToSameMitra,
    handleSyncFromDailyAttendance,
    handleKeyDownScore,
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
                Bimbingan Saya ({myGuidanceCountNilai})
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">
              Mode: {canManageAll ? 'Administrator Hubin' : 'Guru Pembimbing Lapangan'}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
          {/* 1 & 2. Tahun Pelajaran & Semester */}
          <AcademicContextBar
            id="filter-pkl"
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

          {/* 3. Smart Filter Kelas */}
          <div>
            <label htmlFor="filter-kelas-pkl" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Filter Kelas Siswa PKL
            </label>
            <SearchableSelect
              id="filter-kelas-pkl"
              aria-label="Pilih kelas siswa PKL"
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
        </div>
      </Card>
      )}

      {/* High-Density Spreadsheet Grid Table */}
      <SpreadsheetGridTable<ScoreRow>
        data={paginatedScores || []}
        columns={spreadsheetColumns}
        columnGroups={columnGroups}
        rowKey={(score, index) => score.siswa_pkl_id || `score-${index}`}
        isLoading={isLoadingRekap}
        emptyMessage={
          selectedKelas
            ? 'Belum ada data penempatan PKL aktif pada kelas yang dipilih.'
            : 'Belum ada data penempatan PKL aktif pada periode akademik ini.'
        }
        density="compact"
        enableFullscreen={true}
        headerTitle="Lembar Penilaian PKL DUDI"
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              aria-label="Simpan perubahan nilai"
              onClick={onSaveBatch}
              disabled={isSavingBatch || displayedScores?.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none text-xs h-[34px] px-3.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingBatch ? 'Menyimpan...' : 'Simpan'}</span>
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
                  <label htmlFor="nilai-limit-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Limit:</label>
                  <select 
                    id="nilai-limit-select"
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
    </div>
  );
};

export default PklNilaiIndustriTab;
