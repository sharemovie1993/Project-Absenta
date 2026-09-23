import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AcademicContextBar } from '@/components/akademik/AcademicContextBar';
import SiswaIdentityCell from '@/components/common/SiswaIdentityCell';
import { ClipboardPaste, Save, RotateCcw, Copy, Printer } from 'lucide-react';
import { ScoreRow } from './types';

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
  onOpenPasteModal: () => void;
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
  onPrintSertifikat: (row: ScoreRow) => void;
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
  onPrintSertifikat,
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
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

          {/* 4. Action Button: Paste Excel */}
          <div>
            <label className="block text-[10px] font-bold text-transparent uppercase mb-1 select-none hidden lg:block">
              Impor
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPasteModal}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl h-10 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <ClipboardPaste size={14} className="text-emerald-500" />
              Paste dari Excel
            </Button>
          </div>

          {/* 5. Action Button: Simpan Nilai PKL */}
          <div>
            <label className="block text-[10px] font-bold text-transparent uppercase mb-1 select-none hidden lg:block">
              Simpan
            </label>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSaveBatch}
              disabled={isSavingBatch || displayedScores?.length === 0}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl h-10 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              <Save size={14} />
              {isSavingBatch ? 'Menyimpan...' : 'Simpan Nilai PKL'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Grid Table */}
      <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden p-0 bg-white dark:bg-slate-900">
        {isLoadingRekap ? (
          <div className="text-center py-20 text-xs text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
            Memuat data penilaian PKL siswa...
          </div>
        ) : displayedScores?.length === 0 ? (
          <div className="text-center py-20 text-xs text-slate-400">
            {selectedKelas 
              ? 'Belum ada data penempatan PKL aktif pada kelas yang dipilih.' 
              : 'Belum ada data penempatan PKL aktif pada periode akademik ini.'}
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-center w-12">No</th>
                  <th className="p-3 min-w-[160px]">Siswa & Mitra DUDI</th>
                  <th className="p-3 min-w-[150px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Instruktur & PIC</span>
                    <span className="text-[9px] font-normal text-indigo-500 uppercase tracking-tight">DUDI / Lapangan</span>
                  </th>
                  <th className="p-3 text-center min-w-[85px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Teknis</span>
                    <span className="text-[9px] font-normal text-indigo-500 uppercase tracking-tight">Hard Skill</span>
                  </th>
                  <th className="p-3 text-center min-w-[85px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">K3LH</span>
                    <span className="text-[9px] font-normal text-indigo-500 uppercase tracking-tight">Hard Skill</span>
                  </th>
                  <th className="p-3 text-center min-w-[85px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Bisnis</span>
                    <span className="text-[9px] font-normal text-indigo-500 uppercase tracking-tight">Hard Skill</span>
                  </th>
                  <th className="p-3 text-center min-w-[85px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Disiplin</span>
                    <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                  </th>
                  <th className="p-3 text-center min-w-[85px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Inisiatif</span>
                    <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                  </th>
                  <th className="p-3 text-center min-w-[85px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Kerjasama</span>
                    <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                  </th>
                  <th className="p-3 text-center min-w-[85px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Kejujuran</span>
                    <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                  </th>
                  <th className="p-3 text-center min-w-[85px]">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Tanggung Jwb</span>
                    <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                  </th>
                  <th className="p-3 text-center min-w-[80px]">Nilai Akhir</th>
                  <th className="p-3 text-center min-w-[80px]">Predikat</th>
                  <th className="p-3 text-center min-w-[130px]">
                    <div className="flex items-center justify-center gap-1">
                      <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Presensi PKL</span>
                      <button
                        type="button"
                        onClick={handleSyncFromDailyAttendance}
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors cursor-pointer"
                        title="Tarik & sinkronkan Sakit/Izin/Alpa dari presensi harian siswa"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                    <span className="text-[9px] font-normal text-amber-600 dark:text-amber-400 uppercase tracking-tight">S / I / A (Hari)</span>
                  </th>
                  <th className="p-3 min-w-[150px]">Catatan Evaluasi</th>
                  <th className="p-3 text-center min-w-[100px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedScores?.map((score, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={score.siswa_pkl_id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
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
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40 mt-1 ml-12">
                            🟢 Aktif
                          </span>
                        ) : null}
                      </td>

                      <td className="p-2">
                        <div className="space-y-1">
                          <input
                            id={`score-instruktur-${globalIndex}`}
                            aria-label={`Nama instruktur ${score.nama_siswa}`}
                            type="text"
                            placeholder="Nama Instruktur..."
                            value={score.instruktur_nama || ''}
                            onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'instruktur_nama', e.target.value)}
                            className="w-full min-w-[130px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium px-2 py-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            title="Nama Instruktur Industri / Pembimbing Lapangan"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              id={`score-pic-${globalIndex}`}
                              aria-label={`Penanggung jawab DUDI ${score.nama_siswa}`}
                              type="text"
                              placeholder="PIC / Pimpinan DUDI..."
                              value={score.penanggung_jawab_nama || ''}
                              onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'penanggung_jawab_nama', e.target.value)}
                              className="w-full text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              title="Penanggung Jawab / Pimpinan Mitra DUDI (Opsional)"
                            />
                            {score.mitra_nama && score.instruktur_nama && (
                              <button
                                type="button"
                                onClick={() => handleApplyToSameMitra(score.mitra_nama, score.instruktur_nama, score.penanggung_jawab_nama)}
                                className="shrink-0 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors cursor-pointer"
                                title={`Terapkan instruktur ini ke semua siswa di ${score.mitra_nama}`}
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-2 text-center">
                        <input
                          id={`score-tek-${globalIndex}`}
                          aria-label={`Nilai teknis ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          placeholder="0"
                          value={score.hard_kompetensi_teknis ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'hard_kompetensi_teknis', e.target.value)}
                          className="w-16 h-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-center text-blue-900 dark:text-blue-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          id={`score-k3-${globalIndex}`}
                          aria-label={`Nilai SOP K3LH ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          placeholder="0"
                          value={score.hard_sop_k3lh ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'hard_sop_k3lh', e.target.value)}
                          className="w-16 h-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-center text-blue-900 dark:text-blue-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          id={`score-bis-${globalIndex}`}
                          aria-label={`Nilai alur bisnis ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          placeholder="0"
                          value={score.hard_alur_bisnis ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'hard_alur_bisnis', e.target.value)}
                          className="w-16 h-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-center text-blue-900 dark:text-blue-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          id={`score-dis-${globalIndex}`}
                          aria-label={`Nilai kedisiplinan ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          placeholder="0"
                          value={score.soft_kedisiplinan ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kedisiplinan', e.target.value)}
                          className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          id={`score-ini-${globalIndex}`}
                          aria-label={`Nilai inisiatif & kerajinan ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          placeholder="0"
                          value={score.soft_kerajinan_inisiatif ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kerajinan_inisiatif', e.target.value)}
                          className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          id={`score-ker-${globalIndex}`}
                          aria-label={`Nilai kerjasama ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          placeholder="0"
                          value={score.soft_kerjasama ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kerjasama', e.target.value)}
                          className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          id={`score-juj-${globalIndex}`}
                          aria-label={`Nilai kejujuran ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          placeholder="0"
                          value={score.soft_kejujuran ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kejujuran', e.target.value)}
                          className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          id={`score-tj-${globalIndex}`}
                          aria-label={`Nilai tanggung jawab ${score.nama_siswa}`}
                          type="number" min={0} max={100}
                          placeholder="0"
                          value={score.soft_tanggung_jawab ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_tanggung_jawab', e.target.value)}
                          className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      <td className="p-2 text-center font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {score.nilai_akhir_pkl ?? '-'}
                      </td>

                      <td className="p-2 text-center">
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                          {score.predikat_pkl}
                        </span>
                      </td>

                      <td className="p-2 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 leading-none mb-0.5" title="Sakit">S</span>
                            <input
                              id={`score-sakit-${globalIndex}`}
                              aria-label={`Sakit ${score.nama_siswa}`}
                              type="number"
                              min={0}
                              max={365}
                              placeholder="0"
                              value={score.sakit_pkl || ''}
                              onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'sakit_pkl', e.target.value)}
                              className="w-8 h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Ketidakhadiran Sakit (Hari)"
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 leading-none mb-0.5" title="Izin">I</span>
                            <input
                              id={`score-izin-${globalIndex}`}
                              aria-label={`Izin ${score.nama_siswa}`}
                              type="number"
                              min={0}
                              max={365}
                              placeholder="0"
                              value={score.izin_pkl || ''}
                              onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'izin_pkl', e.target.value)}
                              className="w-8 h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Ketidakhadiran Izin (Hari)"
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 leading-none mb-0.5" title="Alpa">A</span>
                            <input
                              id={`score-alpa-${globalIndex}`}
                              aria-label={`Alpa ${score.nama_siswa}`}
                              type="number"
                              min={0}
                              max={365}
                              placeholder="0"
                              value={score.alpa_pkl || ''}
                              onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'alpa_pkl', e.target.value)}
                              className="w-8 h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Ketidakhadiran Alpa / Tanpa Keterangan (Hari)"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-2">
                        <input
                          id={`score-cat-${globalIndex}`}
                          aria-label={`Catatan evaluasi ${score.nama_siswa}`}
                          type="text"
                          placeholder="Catatan evaluasi..."
                          value={score.catatan_pkl}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'catatan_pkl', e.target.value)}
                          className="w-full min-w-[140px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => onPrintSertifikat(score)}
                          className="text-[10px] font-bold flex items-center gap-1 mx-auto"
                        >
                          <Printer size={12} />
                          Sertifikat
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Standardized Premium Pagination Footer */}
        {displayedScores?.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
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
        )}
      </Card>
    </div>
  );
};

export default PklNilaiIndustriTab;
