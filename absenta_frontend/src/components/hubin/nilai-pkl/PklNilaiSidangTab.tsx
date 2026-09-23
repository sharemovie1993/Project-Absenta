import React from 'react';
import { Card, Button, SearchableSelect } from '@/components/ui';
import { AcademicContextBar } from '@/components/common';
import SiswaIdentityCell from '@/components/common/SiswaIdentityCell';
import { Info, Lock, Save, FileText, Check } from 'lucide-react';
import { ScoreRow } from './types';

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
}) => {
  return (
    <div className="space-y-4">
      {/* Filter & Action Card */}
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

          {/* Simpan Nilai Sidang */}
          <div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSaveBatch}
              disabled={isSavingBatch || displayedScores?.length === 0 || !isCompositeMode}
              title={!isCompositeMode ? 'Form terkunci karena skema aktif adalah DUDI 100%' : undefined}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl h-10 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              {isSavingBatch ? 'Menyimpan...' : (!isCompositeMode ? 'Skema Terkunci (DUDI 100%)' : 'Simpan Nilai Sidang')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Sidang Table */}
      <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden p-0 bg-white dark:bg-slate-900">
        {isLoadingRekap ? (
          <div className="text-center py-20 text-xs text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
            Memuat data ujian sidang PKL siswa...
          </div>
        ) : displayedScores?.length === 0 ? (
          <div className="text-center py-20 text-xs text-slate-400">
            Belum ada siswa pada filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-center w-12">No</th>
                  <th className="p-3 min-w-[170px]">Siswa & Rombel</th>
                  <th className="p-3 min-w-[130px]">Portofolio / Laporan</th>
                  <th className="p-3 text-center min-w-[85px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">DUDI</span>
                    <span className="text-[9px] font-normal text-blue-500 uppercase tracking-tight">
                      {isCompositeMode ? `Rerata (${effectiveSettings?.weightDudi ?? 70}%)` : 'Rerata (100%)'}
                    </span>
                  </th>
                  <th className="p-3 text-center min-w-[95px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Laporan</span>
                    <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                      {isCompositeMode ? `(${effectiveSettings?.weightLaporan ?? 15}%)` : '(Arsip)'}
                    </span>
                  </th>
                  <th className="p-3 text-center min-w-[95px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Sidang</span>
                    <span className="text-[9px] font-normal text-purple-600 dark:text-purple-400 uppercase tracking-tight">
                      {isCompositeMode ? `(${effectiveSettings?.weightSidang ?? 15}%)` : '(Arsip)'}
                    </span>
                  </th>
                  <th className="p-3 min-w-[150px]">Guru Penguji</th>
                  <th className="p-3 min-w-[160px]">Catatan / Revisi Sidang</th>
                  <th className="p-3 text-center min-w-[85px]">Nilai Akhir</th>
                  <th className="p-3 text-center min-w-[80px]">Predikat</th>
                  <th className="p-3 text-center min-w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedScores?.map((score, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
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
                  const hasExamined = score.nilai_sidang !== null && score.nilai_sidang !== undefined;

                  return (
                    <tr key={`sidang-${score.siswa_pkl_id || index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center font-mono font-bold text-slate-400">{globalIndex}</td>
                      <td className="p-3">
                        <SiswaIdentityCell
                          foto={score.foto}
                          nama={score.nama_siswa}
                          nis={score.nis}
                          kelas={score.nama_kelas}
                          size="sm"
                          nameClassName="font-bold text-slate-900 dark:text-white"
                          showMeta={true}
                        />
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 pl-12">🏢 {score.mitra_nama}</p>
                        {score.catatan_pkl && score.catatan_pkl.includes('Mutasi:') ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40 mt-1 ml-12">
                            🏷️ {score.catatan_pkl} (Selesai)
                          </span>
                        ) : score.status === 'SELESAI' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/40 mt-1 ml-12">
                            ✅ Selesai
                          </span>
                        ) : score.status === 'AKTIF' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-800/40 mt-1 ml-12">
                            🟢 Aktif
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3">
                        {score.file_portofolio ? (
                          <a
                            href={score.file_portofolio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                          >
                            <FileText size={12} />
                            Buka Berkas ↗
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">Belum Ada</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <span className="inline-block px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs">
                          {dAvg ?? '-'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <input
                          id={`score-lap-${globalIndex}`}
                          aria-label={`Nilai laporan ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          disabled={!isCompositeMode}
                          placeholder={!isCompositeMode ? '-' : '0'}
                          value={!isCompositeMode ? '' : (score.nilai_laporan ?? '')}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'nilai_laporan', e.target.value)}
                          className={`w-16 h-8 rounded-lg text-xs font-bold text-center shadow-sm focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            !isCompositeMode
                              ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                          }`}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          id={`score-sid-${globalIndex}`}
                          aria-label={`Nilai sidang ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          disabled={!isCompositeMode}
                          placeholder={!isCompositeMode ? '-' : '0'}
                          value={!isCompositeMode ? '' : (score.nilai_sidang ?? '')}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'nilai_sidang', e.target.value)}
                          className={`w-16 h-8 rounded-lg text-xs font-bold text-center shadow-sm focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            !isCompositeMode
                              ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-purple-50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500'
                          }`}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          id={`score-penguji-${globalIndex}`}
                          aria-label={`Nama penguji ${score.nama_siswa}`}
                          type="text"
                          disabled={!isCompositeMode}
                          placeholder={!isCompositeMode ? 'Terkunci (DUDI 100%)' : 'Nama Guru Penguji'}
                          value={!isCompositeMode ? '' : score.penguji_nama}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'penguji_nama', e.target.value)}
                          className={`w-full min-w-[130px] rounded-lg text-xs font-medium px-2.5 py-1.5 shadow-sm focus:outline-none transition-colors ${
                            !isCompositeMode
                              ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                          }`}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          id={`score-catatan-sidang-${globalIndex}`}
                          aria-label={`Catatan sidang ${score.nama_siswa}`}
                          type="text"
                          disabled={!isCompositeMode}
                          placeholder={!isCompositeMode ? 'Terkunci (DUDI 100%)' : 'Catatan & masukan penguji'}
                          value={!isCompositeMode ? '' : score.catatan_sidang}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'catatan_sidang', e.target.value)}
                          className={`w-full min-w-[140px] rounded-lg text-xs font-medium px-2.5 py-1.5 shadow-sm focus:outline-none transition-colors ${
                            !isCompositeMode
                              ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                          }`}
                        />
                      </td>
                      <td className="p-2 text-center font-bold font-mono">
                        <div className="flex flex-col items-center">
                          <span className={score.nilai_akhir_pkl !== null ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'}>
                            {score.nilai_akhir_pkl ?? '-'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-normal tracking-tight">
                            {isCompositeMode ? (hasExamined ? 'Gabungan' : 'Fallback DUDI') : 'DUDI 100%'}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {score.predikat_pkl}
                      </td>
                      <td className="p-2 text-center">
                        {!isCompositeMode ? (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            Non-Sidang
                          </span>
                        ) : hasExamined ? (
                          Number(score.nilai_sidang) >= 70 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <Check size={10} /> Lulus
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                              Revisi
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            Belum Sidang
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {displayedScores?.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
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
        )}
      </Card>
    </div>
  );
};

export default PklNilaiSidangTab;
