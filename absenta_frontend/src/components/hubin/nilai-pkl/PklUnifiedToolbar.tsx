import React, { useMemo, useState } from 'react';
import { z } from 'zod';
import { Sliders, ChevronDown, ChevronUp, Filter } from 'lucide-react';
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
  onOpenPasteModal?: () => void;
  onSaveBatch?: () => void;
  isSavingBatch?: boolean;
  displayedScoresLength?: number;
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isNilaiTab = activeTab === 'dudi' || activeTab === 'sidang' || activeTab === 'nilai';

  const classSelectOptions = useMemo(() => [
    { value: '', label: `-- Semua Kelas (${scoresCount}) --` },
    ...(smartClassOptions?.map((c) => ({ value: c.value, label: c.label })) || [])
  ], [scoresCount, smartClassOptions]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs space-y-2">
      {/* Baris 1: TabSwitcher Navigasi Utama di Kiri & Bobot / Collapse Toggle di Kanan */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TabSwitcher
            activeTab={activeTab}
            onChange={(t) => setActiveTab(t as string)}
            tabs={tabs}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {canViewScheme && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              className="flex items-center gap-1 text-[11px] font-bold rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 h-8 px-2.5 shrink-0 shadow-2xs"
            >
              <Sliders size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">{canEditScheme ? 'Bobot' : 'Info'}</span>
              <span className="px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold">
                {isCompositeMode
                  ? `${effectiveSettings?.weightDudi}/${effectiveSettings?.weightLaporan}/${effectiveSettings?.weightSidang}%`
                  : '100%'}
              </span>
            </Button>
          )}

          {/* Toggle Minimize/Maximize Filter */}
          {isNilaiTab && (
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              title={isCollapsed ? 'Buka Filter Penilaian' : 'Lipat Filter (Maksimalkan Lembar Kerja)'}
              aria-label={isCollapsed ? 'Buka Filter' : 'Lipat Filter'}
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Baris 2: Context TP, Semester, Kelas, Scoping, dan Status Filter */}
      {!isCollapsed && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Kiri: Konteks Akademik & Filter Kelas */}
          <div className="flex items-center gap-2 flex-wrap">
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

            {/* Filter Kelas Sejajar Langsung */}
            {isNilaiTab && (
              <div className="w-44 sm:w-52">
                <SearchableSelect
                  id="unified-filter-kelas-pkl"
                  aria-label="Pilih kelas siswa PKL"
                  value={selectedKelas}
                  onValueChange={setSelectedKelas}
                  options={classSelectOptions}
                  placeholder="Pilih Kelas"
                  isLoading={isLoadingRekap}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {/* Kanan: Scoping & Status Filter (Hanya pada Tab Nilai) */}
          {isNilaiTab && (
            <div className="flex items-center gap-2 flex-wrap justify-between xl:justify-end">
              {canManageAll && activeGuruId ? (
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setGuidanceScope('ALL');
                      setSelectedKelas('');
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      guidanceScope === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {isKaprog ? 'Semua Jurusan' : (isWaliKelas ? `Kelas ${walikelasKelas?.nama_kelas || ''}` : 'Semua Siswa')} ({allScopedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGuidanceScope('MY_GUIDANCE');
                      setSelectedKelas('');
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      guidanceScope === 'MY_GUIDANCE'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Bimbingan Saya ({myGuidanceCountNilai})
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium self-center">
                  Mode: {canManageAll ? 'Administrator Hubin' : 'Guru Pembimbing Lapangan'}
                </span>
              )}

              {/* Status Penempatan Filter */}
              {!isMobile && (
                <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-semibold overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ELIGIBLE')}
                    className={`px-2 py-1 rounded-md text-[11px] transition-all whitespace-nowrap ${
                      statusFilter === 'ELIGIBLE'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Siap Dinilai: Menampilkan siswa aktif & selesai tanpa duplikat mutasi"
                  >
                    🎯 Siap Dinilai
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('AKTIF')}
                    className={`px-2 py-1 rounded-md text-[11px] transition-all whitespace-nowrap ${
                      statusFilter === 'AKTIF'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    🟢 Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('SELESAI')}
                    className={`px-2 py-1 rounded-md text-[11px] transition-all whitespace-nowrap ${
                      statusFilter === 'SELESAI'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    ✅ Selesai
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2 py-1 rounded-md text-[11px] transition-all whitespace-nowrap ${
                      statusFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    📋 Semua
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default PklUnifiedToolbar;
