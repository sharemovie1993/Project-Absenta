import React, { useMemo } from 'react';
import { z } from 'zod';
import { Sliders, Save, ClipboardPaste } from 'lucide-react';
import { Button, SearchableSelect } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { AcademicContextBar } from '@/components/common/AcademicContextBar';

// Zod Schema Guard (Pilar 25 Hardening)
export const pklToolbarFilterSchema = z.object({
  selectedTp: z.string().optional(),
  selectedSemester: z.string().optional(),
  selectedKelas: z.string().optional(),
  guidanceScope: z.enum(['ALL', 'MY_GUIDANCE']).default('ALL'),
  statusFilter: z.enum(['ALL', 'AKTIF', 'SELESAI', 'ELIGIBLE']).default('ELIGIBLE'),
});

export interface PklUnifiedToolbarProps {
  selectedTp: string;
  selectedSemester: string;
  setSelectedTp: (tp: string) => void;
  setSelectedSemester: (sem: string) => void;
  tpOptions: { value: string; label: string }[];
  semesterOptions: { value: string; label: string }[];
  isLoadingTp: boolean;
  isLoadingSem: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: Array<{ id: string; label: string }>;
  canViewScheme: boolean;
  canEditScheme: boolean;
  isCompositeMode: boolean;
  effectiveSettings?: {
    assessmentMode?: string;
    weightDudi?: number;
    weightLaporan?: number;
    weightSidang?: number;
  };
  onOpenSettings: () => void;
  canManageAll: boolean;
  activeGuruId: string | null;
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
  selectedKelas: string;
  setSelectedKelas: (kelasId: string) => void;
  smartClassOptions: { value: string; label: string }[];
  scoresCount: number;
  isLoadingRekap: boolean;
  onOpenPasteModal: () => void;
  onSaveBatch: () => void;
  isSavingBatch: boolean;
  displayedScoresLength: number;
}

export const PklUnifiedToolbar: React.FC<PklUnifiedToolbarProps> = React.memo(({
  selectedTp,
  selectedSemester,
  setSelectedTp,
  setSelectedSemester,
  tpOptions,
  semesterOptions,
  isLoadingTp,
  isLoadingSem,
  activeTab,
  setActiveTab,
  tabs,
  canViewScheme,
  canEditScheme,
  isCompositeMode,
  effectiveSettings,
  onOpenSettings,
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
  selectedKelas,
  setSelectedKelas,
  smartClassOptions,
  scoresCount,
  isLoadingRekap,
  onOpenPasteModal,
  onSaveBatch,
  isSavingBatch,
  displayedScoresLength,
}) => {
  const isNilaiTab = activeTab === 'dudi' || activeTab === 'sidang' || activeTab === 'nilai';

  const classSelectOptions = useMemo(() => [
    { value: '', label: `-- Semua Kelas PKL (${scoresCount} Siswa) --` },
    ...(smartClassOptions?.map((c) => ({ value: c.value, label: c.label })) || [])
  ], [scoresCount, smartClassOptions]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3.5">
      {/* Baris 1: Konteks Akademik di Kiri, TabSwitcher & Tombol Skema di Kanan */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 ${isNilaiTab ? 'pb-3 border-b border-slate-100 dark:border-slate-800' : ''}`}>
        <div className="w-full md:w-auto">
          <AcademicContextBar
            id="filter-pkl-unified"
            tahunPelajaranId={selectedTp}
            semesterId={selectedSemester}
            onTahunPelajaranChange={setSelectedTp}
            onSemesterChange={setSelectedSemester}
            tpOptions={tpOptions}
            semesterOptions={semesterOptions}
            isLoadingTp={isLoadingTp}
            isLoadingSem={isLoadingSem}
            variant="toolbar"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto flex-wrap">
          <TabSwitcher
            activeTab={activeTab}
            onChange={(t) => setActiveTab(t as string)}
            tabs={tabs}
          />

          {canViewScheme && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 h-[38px] px-3 shrink-0"
            >
              <Sliders size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">{canEditScheme ? 'Skema & Bobot' : 'Info Bobot'}</span>
              {isCompositeMode ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                  {effectiveSettings?.weightDudi}/{effectiveSettings?.weightLaporan}/{effectiveSettings?.weightSidang}%
                </span>
              ) : (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                  DUDI 100%
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Baris 2 & 3: Filter & Action Buttons untuk Tab Nilai (DUDI & Sidang) */}
      {isNilaiTab && (
        <div className="space-y-3">
          {/* Sub-baris 2a: Scoping di kiri, Status Filter di kanan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {canManageAll && activeGuruId ? (
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold self-start sm:self-auto">
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
              <span className="text-[11px] text-slate-400 font-medium self-center">
                Mode: {canManageAll ? 'Administrator Hubin' : 'Guru Pembimbing Lapangan'}
              </span>
            )}

            {/* Status Penempatan Filter */}
            {!isMobile && (
              <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ELIGIBLE')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    statusFilter === 'ELIGIBLE'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Mode Fleksibel: Menampilkan siswa aktif & selesai tanpa duplikat riwayat mutasi"
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
                >
                  📋 Semua
                </button>
              </div>
            )}
          </div>

          {/* Sub-baris 2b: Filter Kelas & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pt-1">
            <div className="flex-1 max-w-sm">
              <label htmlFor="unified-filter-kelas-pkl" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Filter Kelas Siswa PKL
              </label>
              <SearchableSelect
                id="unified-filter-kelas-pkl"
                aria-label="Pilih kelas siswa PKL"
                value={selectedKelas}
                onValueChange={setSelectedKelas}
                options={classSelectOptions}
                placeholder="Pilih Kelas"
                isLoading={isLoadingRekap}
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
              {activeTab !== 'sidang' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenPasteModal}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl h-10 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-200 px-3.5"
                >
                  <ClipboardPaste size={14} className="text-emerald-500" />
                  <span>Paste dari Excel</span>
                </Button>
              )}

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onSaveBatch}
                disabled={isSavingBatch || displayedScoresLength === 0 || (activeTab === 'sidang' && !isCompositeMode)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl h-10 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 px-4"
              >
                <Save size={14} />
                <span>
                  {isSavingBatch
                    ? 'Menyimpan...'
                    : (activeTab === 'sidang'
                      ? (!isCompositeMode ? 'Skema Terkunci' : 'Simpan Nilai Sidang')
                      : 'Simpan Nilai PKL')}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default PklUnifiedToolbar;
