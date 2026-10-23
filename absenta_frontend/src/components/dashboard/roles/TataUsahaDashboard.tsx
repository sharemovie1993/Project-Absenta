import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ArrowLeftRight,
  Award,
  FileSpreadsheet,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
} from 'lucide-react';
import { Loader } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useAuthStore } from '@/store/authStore';
import { getTuStats } from '@/api/dashboard.api';
import { TuBerandaTab } from './tu/tabs/TuBerandaTab';
import type { TuTabId, TuNavTabItem, TuStatsData } from './tu/types';

// Code-splitting Universal Views (Pilar 21B & TBT Optimization)
const BukuIndukView = lazy(() =>
  import('@/components/academic/buku-induk/BukuIndukView').then((m) => ({ default: m.BukuIndukView }))
);
const SuratKeteranganView = lazy(() =>
  import('@/components/correspondence/surat-keterangan/SuratKeteranganView').then((m) => ({
    default: m.SuratKeteranganView,
  }))
);
const MutasiSiswaView = lazy(() =>
  import('@/components/correspondence/mutasi/MutasiSiswaView').then((m) => ({ default: m.MutasiSiswaView }))
);
const BastIjazahView = lazy(() =>
  import('@/components/correspondence/bast-ijazah/BastIjazahView').then((m) => ({ default: m.BastIjazahView }))
);
const DknView = lazy(() =>
  import('@/components/correspondence/dkn/DknView').then((m) => ({ default: m.DknView }))
);
const KepegawaianDashboard = lazy(() =>
  import('./KepegawaianDashboard').then((m) => ({ default: m.KepegawaianDashboard }))
);

// Modals untuk 1-click Action Center dari Beranda
const SuratKeteranganModal = lazy(() =>
  import('@/components/correspondence/surat-keterangan/SuratKeteranganModal').then((m) => ({
    default: m.SuratKeteranganModal,
  }))
);
const MutasiKeluarModal = lazy(() =>
  import('@/components/correspondence/mutasi/MutasiKeluarModal').then((m) => ({ default: m.MutasiKeluarModal }))
);
const BastIjazahModal = lazy(() =>
  import('@/components/correspondence/bast-ijazah/BastIjazahModal').then((m) => ({ default: m.BastIjazahModal }))
);
const DknPrintModal = lazy(() =>
  import('@/components/correspondence/dkn/DknPrintModal').then((m) => ({ default: m.DknPrintModal }))
);

export interface TataUsahaDashboardProps {
  user?: any;
}

export const TataUsahaDashboard: React.FC<TataUsahaDashboardProps> = ({ user: propUser }) => {
  const { user: authUser } = useAuthStore();
  const currentUser = propUser || authUser;

  const [searchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as TuTabId | null;

  // Active Tab State
  const [activeTab, setActiveTab] = useState<TuTabId>(() => {
    if (
      subtabParam &&
      ['beranda', 'buku-induk', 'surat-keterangan', 'mutasi', 'bast-ijazah', 'dkn', 'kepegawaian'].includes(subtabParam)
    ) {
      return subtabParam;
    }
    return 'beranda';
  });

  // Keep-Alive Cache: Catat tab yang pernah dibuka agar TIDAK DIHANCURKAN saat switch tab (Instant 0ms Switch)
  const [visitedTabs, setVisitedTabs] = useState<Set<TuTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (
      subtabParam &&
      ['beranda', 'buku-induk', 'surat-keterangan', 'mutasi', 'bast-ijazah', 'dkn', 'kepegawaian'].includes(subtabParam)
    ) {
      setActiveTab((curr) => (curr !== subtabParam ? subtabParam : curr));
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    }
  }, [subtabParam]);

  const handleTabSelect = useCallback((tabId: TuTabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => (prev.has(tabId) ? prev : new Set(prev).add(tabId)));
  }, []);

  // Floating Modals State (1-Click Action Center)
  const [isSuratKetModalOpen, setIsSuratKetModalOpen] = useState(false);
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
  const [isBastModalOpen, setIsBastModalOpen] = useState(false);
  const [isDknModalOpen, setIsDknModalOpen] = useState(false);

  // Konteks Akademik Standard Platform (useAcademicFilter SSOT)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const activeTpId = academicFilter.values.tahunPelajaranId;
  const activeSemesterId = academicFilter.values.semesterId;

  // Query Data Statistik TU Terpadu
  const { data: statsResponse, isLoading: isStatsLoading } = useQuery({
    queryKey: ['tu-dashboard-stats', { activeTpId, activeSemesterId }],
    queryFn: () =>
      getTuStats({
        tahun_pelajaran_id: activeTpId,
        semester_id: activeSemesterId,
      }),
  });

  const tuStats: TuStatsData = statsResponse?.data || {};

  // Definisi Navigasi Tabs TU (Sidebar Menu Vertikal)
  const navTabs: TuNavTabItem[] = useMemo(
    () => [
      { id: 'beranda', label: 'Ringkasan', icon: LayoutDashboard },
      {
        id: 'buku-induk',
        label: 'Data Siswa & Klapper',
        icon: BookOpen,
        badge: tuStats?.bukuInduk?.totalSiswaAktif !== undefined ? `${tuStats.bukuInduk.totalSiswaAktif}` : undefined,
      },
      {
        id: 'surat-keterangan',
        label: 'Surat Keterangan',
        icon: FileText,
        badge: tuStats?.persuratan?.suratKeteranganBulanIni !== undefined && tuStats.persuratan.suratKeteranganBulanIni > 0
          ? `${tuStats.persuratan.suratKeteranganBulanIni}`
          : undefined,
      },
      {
        id: 'mutasi',
        label: 'Mutasi Siswa',
        icon: ArrowLeftRight,
        badge: tuStats?.mutasi?.total !== undefined && tuStats.mutasi.total > 0 ? `${tuStats.mutasi.total}` : undefined,
      },
      {
        id: 'bast-ijazah',
        label: 'Clearance & BAST',
        icon: Award,
        badge: tuStats?.ijazah?.sisaBrankas !== undefined && tuStats.ijazah.sisaBrankas > 0 ? `${tuStats.ijazah.sisaBrankas}` : undefined,
      },
      { id: 'dkn', label: 'DKN & Kelulusan', icon: FileSpreadsheet },
      {
        id: 'kepegawaian',
        label: 'Kepegawaian & PTK',
        icon: Users,
        badge: tuStats?.kepegawaian?.totalPtk !== undefined && tuStats.kepegawaian.totalPtk > 0
          ? `${tuStats.kepegawaian.totalPtk}`
          : undefined,
      },
    ],
    [tuStats]
  );

  const userName = currentUser?.name || currentUser?.full_name || 'Annisa Demo';
  const userNip = currentUser?.nip || '199401352010011134';
  const userRole = currentUser?.role?.name || currentUser?.jabatan || 'Kepala Tata Usaha';

  return (
    <div className="space-y-6">
      {/* ─── 1. TOP HEADER BANNER: IDENTITAS RESMI (EXACT MATCH KAPROGDASHBOARD) ─── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-inner shrink-0">
              {userName.substring(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  <Building2 className="w-3.5 h-3.5" /> Unit Tata Usaha & Kearsipan
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3" /> Sistem Aktif
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{userName}</h1>
              <p className="text-xs sm:text-sm text-blue-200/90 font-medium">
                NIP: {userNip} &bull; {userRole}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-1.5 text-xs">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/15">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span className="font-semibold text-white">
                TP {academicFilter.selectedTpNama || '2026/2027'} &bull; {academicFilter.selectedSemNama || 'Semester Ganjil'}
              </span>
            </div>
            <span className="text-[10px] text-blue-200/70 font-mono">Permendiknas No. 24/2008</span>
          </div>
        </div>
      </div>

      {/* ─── MOBILE CONTROLS (< lg): COMPACT FILTER & HORIZONTAL PILL ROW ─── */}
      <div className="lg:hidden space-y-3">
        <AcademicFilterToolbar
          {...academicFilter.toolbarProps}
          variant="compact"
          className="w-full"
        />

        <div className="flex overflow-x-auto gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs no-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0',
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold min-w-4 text-center',
                      isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. DESKTOP 2-COLUMN SPLIT-PANE LAYOUT (>= lg: LEFT SIDEBAR + MAIN CONTENT) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* LEFT COLUMN: SIDEBAR CONTROLS (DESKTOP STICKY) */}
        <aside className="hidden lg:block sticky top-20 space-y-3">
          {/* Identitas Unit Ringkas & Minimalis */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                TU
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block leading-tight">
                  Unit Kerja
                </span>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                  TATA USAHA
                </h2>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-medium">Kode Layanan</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                PERSURATAN
              </span>
            </div>
          </div>

          {/* Academic Filter Toolbar (Sidebar Variant SSOT) */}
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            variant="sidebar"
          />

          {/* Navigasi Menu Vertikal (Sidebar Menu) */}
          <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabSelect(tab.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center transition-colors shrink-0',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* RIGHT COLUMN: WIDE MAIN CONTENT CANVAS */}
        <main className="min-w-0 space-y-4">
          {/* TAB 1: BERANDA COMMAND CENTER */}
          {visitedTabs.has('beranda') && (
            <div className={activeTab === 'beranda' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <TuBerandaTab
                stats={tuStats}
                onSelectTab={handleTabSelect}
                onOpenSuratKeterangan={() => setIsSuratKetModalOpen(true)}
                onOpenMutasi={() => setIsMutasiModalOpen(true)}
                onOpenBastIjazah={() => setIsBastModalOpen(true)}
                onOpenDknPrint={() => setIsDknModalOpen(true)}
              />
            </div>
          )}

          {/* TAB 2: BUKU INDUK & KLAPPER */}
          {visitedTabs.has('buku-induk') && (
            <div className={activeTab === 'buku-induk' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <BukuIndukView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* TAB 3: SURAT KETERANGAN */}
          {visitedTabs.has('surat-keterangan') && (
            <div className={activeTab === 'surat-keterangan' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <SuratKeteranganView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* TAB 4: DOKUMEN MUTASI SISWA */}
          {visitedTabs.has('mutasi') && (
            <div className={activeTab === 'mutasi' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <MutasiSiswaView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* TAB 5: BAST IJAZAH & CLEARANCE */}
          {visitedTabs.has('bast-ijazah') && (
            <div className={activeTab === 'bast-ijazah' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <BastIjazahView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* TAB 6: DKN & ARSIP KELULUSAN */}
          {visitedTabs.has('dkn') && (
            <div className={activeTab === 'dkn' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <DknView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* TAB 7: KEPEGAWAIAN & DAPODIK PTK */}
          {visitedTabs.has('kepegawaian') && (
            <div className={activeTab === 'kepegawaian' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <KepegawaianDashboard user={currentUser} hideLayout={true} />
              </Suspense>
            </div>
          )}
        </main>
      </div>

      {/* ─── FLOATING MODALS (1-CLICK ACTION CENTER DARI BERANDA) ─── */}
      {isSuratKetModalOpen && (
        <Suspense fallback={null}>
          <SuratKeteranganModal
            isOpen={isSuratKetModalOpen}
            onClose={() => setIsSuratKetModalOpen(false)}
          />
        </Suspense>
      )}

      {isMutasiModalOpen && (
        <Suspense fallback={null}>
          <MutasiKeluarModal
            isOpen={isMutasiModalOpen}
            onClose={() => setIsMutasiModalOpen(false)}
          />
        </Suspense>
      )}

      {isBastModalOpen && (
        <Suspense fallback={null}>
          <BastIjazahModal
            isOpen={isBastModalOpen}
            onClose={() => setIsBastModalOpen(false)}
            siswaId=""
          />
        </Suspense>
      )}

      {isDknModalOpen && (
        <Suspense fallback={null}>
          <DknPrintModal
            isOpen={isDknModalOpen}
            onClose={() => setIsDknModalOpen(false)}
            tahunPelajaran={academicFilter.selectedTpNama}
          />
        </Suspense>
      )}
    </div>
  );
};

export default TataUsahaDashboard;
