import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Wallet,
  ShieldCheck,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Loader, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { getTuStats } from '@/api/dashboard.api';
import { TuBerandaTab } from './tu/tabs/TuBerandaTab';
import type { TuTabId, TuStatsData } from './tu/types';
import { DivisiStrukturOrganisasiView } from '@/components/academic/struktur/DivisiStrukturOrganisasiView';
import {
  UniversalMobileSubtabSidebar,
  useMobileSubtabSidebar,
  UniversalEcosystemTopbar,
} from './common';
import {
  getTuNavTabs,
  getVisibleTuCategories,
} from './tu/tuNavigation.config';

// Code-splitting Universal Views (Pilar 21B & TBT Optimization)
const SuratMasukView = lazy(() =>
  import('@/components/correspondence/surat-masuk/SuratMasukView').then((m) => ({ default: m.SuratMasukView }))
);
const SuratKeluarView = lazy(() =>
  import('@/components/correspondence/surat-keluar/SuratKeluarView').then((m) => ({ default: m.SuratKeluarView }))
);
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
const DapodikIntegrationView = lazy(() =>
  import('@/components/academic/dapodik/DapodikIntegrationView').then((m) => ({ default: m.DapodikIntegrationView }))
);

// Reused Sarpras Universal Tabs untuk TU_SARPRAS & TU_KEPALA
const SarprasInventarisTab = lazy(() =>
  import('./sarpras/tabs/SarprasInventarisTab').then((m) => ({ default: m.SarprasInventarisTab }))
);
const SarprasPeminjamanTab = lazy(() =>
  import('./sarpras/tabs/SarprasPeminjamanTab').then((m) => ({ default: m.SarprasPeminjamanTab }))
);
const SarprasPerbaikanTab = lazy(() =>
  import('./sarpras/tabs/SarprasPerbaikanTab').then((m) => ({ default: m.SarprasPerbaikanTab }))
);
const SarprasDenahTab = lazy(() =>
  import('./sarpras/tabs/SarprasDenahTab').then((m) => ({ default: m.SarprasDenahTab }))
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
  user?: Record<string, unknown>;
}

export const TataUsahaDashboard: React.FC<TataUsahaDashboardProps> = ({ user: propUser }) => {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const currentUser = (propUser || authUser) as {
    name?: string;
    full_name?: string;
    nip?: string;
    jabatan?: string;
    role?: { name?: string };
  } | null;

  const {
    can,
    isAdmin,
    isTUKepala,
    isTUPersuratan,
    isTUKepegawaian,
    isTUKeuangan,
    isTUSarpras,
  } = useCapabilities();

  const canTuCap = useCallback(
    (capability: string) => isAdmin || can(capability),
    [isAdmin, can]
  );

  // Identitas Unit Kerja Dinamis sesuai Jabatan TU (Single Unified Shell)
  const tuIdentity = useMemo(() => {
    const activeRoles: string[] = [];
    if (isTUKepala) activeRoles.push('Koordinator Tata Usaha');
    if (isTUPersuratan) activeRoles.push('Staf Persuratan & Arsip');
    if (isTUKepegawaian) activeRoles.push('Staf Kepegawaian & Dapodik');
    if (isTUKeuangan) activeRoles.push('Staf Keuangan & SPP');
    if (isTUSarpras) activeRoles.push('Staf Logistik & Aset');

    if (isTUKepala) {
      return {
        unitTitle: 'Unit Tata Usaha & Supervisi',
        sidebarCode: 'KOR TU',
        roleLabel: activeRoles.join(' • '),
      };
    }
    if (activeRoles.length > 1) {
      return {
        unitTitle: 'Unit Tata Usaha Terpadu',
        sidebarCode: 'TU MULTI',
        roleLabel: activeRoles.join(' • '),
      };
    }
    if (isTUPersuratan) {
      return {
        unitTitle: 'Unit Persuratan & Kearsipan',
        sidebarCode: 'PERSURATAN',
        roleLabel: activeRoles[0],
      };
    }
    if (isTUKepegawaian) {
      return {
        unitTitle: 'Unit Kepegawaian & Dapodik',
        sidebarCode: 'KEPEGAWAIAN',
        roleLabel: activeRoles[0],
      };
    }
    if (isTUKeuangan) {
      return {
        unitTitle: 'Unit Keuangan & SPP Sekolah',
        sidebarCode: 'KEUANGAN',
        roleLabel: activeRoles[0],
      };
    }
    if (isTUSarpras) {
      return {
        unitTitle: 'Unit Logistik & Inventaris KIB',
        sidebarCode: 'SARPRAS TU',
        roleLabel: activeRoles[0],
      };
    }
    return {
      unitTitle: 'Unit Tata Usaha & Administrasi',
      sidebarCode: isAdmin ? 'ADMIN TU' : 'TATA USAHA',
      roleLabel: isAdmin ? 'Administrator Tata Usaha' : (currentUser?.jabatan || currentUser?.role?.name || 'Staf Tata Usaha'),
    };
  }, [isTUKepala, isTUPersuratan, isTUKepegawaian, isTUKeuangan, isTUSarpras, isAdmin, currentUser]);

  // Konteks Akademik Standard Platform (useAcademicFilter SSOT)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const activeTpId = academicFilter.values.tahunPelajaranId;
  const activeSemesterId = academicFilter.values.semesterId;

  // Query Data Statistik TU Terpadu
  const { data: statsResponse } = useQuery({
    queryKey: ['tu-dashboard-stats', { activeTpId, activeSemesterId }],
    queryFn: () =>
      getTuStats({
        tahun_pelajaran_id: activeTpId,
        semester_id: activeSemesterId,
      }),
  });

  const tuStats: TuStatsData = useMemo(() => statsResponse?.data || {}, [statsResponse?.data]);

  // Definisi Navigasi Tabs TU Terfilter Berdasarkan Capabilities (DRY SSOT)
  const navTabs = useMemo(
    () =>
      getTuNavTabs(
        {
          suratMasukBaru: tuStats?.suratMasuk?.baru,
          suratKeluarDraft: tuStats?.suratKeluar?.draft,
          suratKeteranganBulanIni: tuStats?.persuratan?.suratKeteranganBulanIni,
          mutasiTotal: tuStats?.mutasi?.total,
          sisaIjazah: tuStats?.ijazah?.sisaBrankas,
          totalSiswaAktif: tuStats?.bukuInduk?.totalSiswaAktif,
          totalPtk: tuStats?.kepegawaian?.totalPtk,
        },
        canTuCap
      ),
    [tuStats, canTuCap]
  );

  const visibleCategories = useMemo(() => getVisibleTuCategories(navTabs), [navTabs]);
  const allowedTabIds = useMemo(() => new Set<TuTabId>(navTabs?.map((t) => t.id) || []), [navTabs]);

  const [searchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as TuTabId | null;

  // Active Tab State (Divalidasi terhadap tab yang boleh diakses user)
  const [activeTab, setActiveTab] = useState<TuTabId>(() => {
    if (subtabParam && allowedTabIds.has(subtabParam)) {
      return subtabParam;
    }
    return 'beranda';
  });

  // Keep-Alive Cache: Catat tab yang pernah dibuka agar TIDAK DIHANCURKAN saat switch tab
  const [visitedTabs, setVisitedTabs] = useState<Set<TuTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (subtabParam && allowedTabIds.has(subtabParam)) {
      setActiveTab((curr) => (curr !== subtabParam ? subtabParam : curr));
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    } else if (!subtabParam || !allowedTabIds.has(activeTab)) {
      setActiveTab('beranda');
      setVisitedTabs((prev) => (prev.has('beranda') ? prev : new Set(prev).add('beranda')));
    }
  }, [subtabParam, allowedTabIds, activeTab]);

  const handleTabSelect = useCallback(
    (tabId: TuTabId) => {
      if (!allowedTabIds.has(tabId)) return;
      setActiveTab(tabId);
      setVisitedTabs((prev) => (prev.has(tabId) ? prev : new Set(prev).add(tabId)));
    },
    [allowedTabIds]
  );

  // Floating Modals State (1-Click Action Center)
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSubtabSidebar('tu');
  const [isSuratKetModalOpen, setIsSuratKetModalOpen] = useState(false);
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
  const [isBastModalOpen, setIsBastModalOpen] = useState(false);
  const [isDknModalOpen, setIsDknModalOpen] = useState(false);

  const userName = currentUser?.name || currentUser?.full_name || 'Pengguna Tata Usaha';
  const userNip = currentUser?.nip || '-';

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'beranda': return 'Ringkasan Tata Usaha';
      case 'surat-masuk': return 'Surat Masuk';
      case 'surat-keluar': return 'Surat Keluar';
      case 'surat-keterangan': return 'Surat Keterangan';
      case 'mutasi': return 'Mutasi Siswa';
      case 'bast-ijazah': return 'BAST Ijazah & Clearance';
      case 'dkn': return 'Kumpulan Nilai (DKN)';
      case 'buku-induk': return 'Buku Induk & Klapper';
      case 'kepegawaian': return 'Data PTK & Kepegawaian';
      case 'dapodik': return 'Sinkronisasi Dapodik';
      case 'keuangan-spp': return 'Keuangan & SPP Sekolah';
      case 'sarpras-inventaris': return 'Inventaris Aset (KIB)';
      case 'sarpras-peminjaman': return 'Peminjaman Sarpras';
      case 'sarpras-perbaikan': return 'Pemeliharaan & Perbaikan';
      case 'sarpras-denah': return 'Denah Spasial Aset';
      case 'struktur_organisasi': return 'Struktur Organisasi TU';
      default: return 'Tata Usaha';
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* ─── 1A. MOBILE TOPBAR TERKUNCI RAMPING ─── */}
      <UniversalEcosystemTopbar
        ecosystem="tu"
        title={currentSubtabTitle}
        icon={Building2}
        className="lg:hidden"
      />

      {/* Standalone Compact Filter Mobile */}
      <div className="lg:hidden p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <AcademicFilterToolbar
          {...academicFilter.toolbarProps}
          variant="compact"
          className="w-full"
        />
      </div>

      {/* ─── 1B. DESKTOP HEADER BANNER: IDENTITAS RESMI DINAMIS ─── */}
      <div className="hidden lg:block bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-inner shrink-0">
              {userName.substring(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  <Building2 className="w-3.5 h-3.5" /> {tuIdentity.unitTitle}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3" /> Sistem Aktif
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{userName}</h1>
              <p className="text-xs sm:text-sm text-blue-200/90 font-medium">
                {userNip !== '-' ? `NIP: ${userNip} • ` : ''}{tuIdentity.roleLabel}
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

      {/* ─── MOBILE CONTROLS (< lg): MOBILE SUBTAB SIDEBAR ─── */}
      <div className="lg:hidden space-y-3">
        <UniversalMobileSubtabSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          title="Unit Tata Usaha"
          subtitle={`TP ${academicFilter.selectedTpNama || '2026/2027'} • ${academicFilter.selectedSemNama || 'Semester Ganjil'}`}
          roleBadge={tuIdentity.sidebarCode}
          scope="tu"
          roleIcon={Building2}
          tabs={navTabs}
          activeTab={activeTab}
          onSelectTab={(tabId) => handleTabSelect(tabId as TuTabId)}
          categories={visibleCategories}
        />
      </div>

      {/* ─── 2. DESKTOP 2-COLUMN SPLIT-PANE LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* LEFT COLUMN: SIDEBAR CONTROLS */}
        <aside className="hidden lg:block sticky top-20 space-y-3">
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
                {tuIdentity.sidebarCode}
              </span>
            </div>
          </div>

          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            variant="sidebar"
          />

          <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            {navTabs?.map((tab) => {
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
          {visitedTabs.has('beranda') && (
            <div className={activeTab === 'beranda' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <TuBerandaTab
                stats={tuStats}
                canAccess={canTuCap}
                onSelectTab={handleTabSelect}
                onOpenSuratKeterangan={() => setIsSuratKetModalOpen(true)}
                onOpenMutasi={() => setIsMutasiModalOpen(true)}
                onOpenBastIjazah={() => setIsBastModalOpen(true)}
                onOpenDknPrint={() => setIsDknModalOpen(true)}
              />
            </div>
          )}

          {allowedTabIds.has('surat-masuk') && visitedTabs.has('surat-masuk') && (
            <div className={activeTab === 'surat-masuk' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <SuratMasukView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('surat-keluar') && visitedTabs.has('surat-keluar') && (
            <div className={activeTab === 'surat-keluar' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <SuratKeluarView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('surat-keterangan') && visitedTabs.has('surat-keterangan') && (
            <div className={activeTab === 'surat-keterangan' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <SuratKeteranganView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('mutasi') && visitedTabs.has('mutasi') && (
            <div className={activeTab === 'mutasi' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <MutasiSiswaView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('bast-ijazah') && visitedTabs.has('bast-ijazah') && (
            <div className={activeTab === 'bast-ijazah' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <BastIjazahView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('dkn') && visitedTabs.has('dkn') && (
            <div className={activeTab === 'dkn' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <DknView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('buku-induk') && visitedTabs.has('buku-induk') && (
            <div className={activeTab === 'buku-induk' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <BukuIndukView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('kepegawaian') && visitedTabs.has('kepegawaian') && (
            <div className={activeTab === 'kepegawaian' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <KepegawaianDashboard user={currentUser} hideLayout={true} />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('dapodik') && visitedTabs.has('dapodik') && (
            <div className={activeTab === 'dapodik' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <DapodikIntegrationView hideLayout={true} />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('keuangan-spp') && visitedTabs.has('keuangan-spp') && (
            <div className={activeTab === 'keuangan-spp' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Modul Keuangan & Tagihan SPP Sekolah
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Namespace kapabilitas <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">tu.finance.*</code> aktif sesuai penetapan SK jabatan Anda.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 self-start">
                    <ShieldCheck className="w-3.5 h-3.5" /> Akses Terotorisasi
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Kapabilitas Aktif (`tu.finance.*`)
                    </div>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                      <li>Kelola Tagihan SPP Siswa (`tu.finance.invoices.*`)</li>
                      <li>Pencatatan & Riwayat Pembayaran (`tu.finance.payments.*`)</li>
                      <li>Laporan Keuangan Sekolah (`tu.finance.reports.view`)</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        Referensi Data Siswa & PTK
                      </div>
                      <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-1">
                        Gunakan data induk siswa dan guru untuk rekonsiliasi tagihan SPP sambil menunggu aktivasi antarmuka transaksi SPP penuh.
                      </p>
                    </div>
                    {canTuCap('academic.students.view.list') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/academic/siswa')}
                        className="self-start text-xs font-semibold bg-white dark:bg-slate-900"
                      >
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                        Lihat Data Siswa
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {allowedTabIds.has('sarpras-inventaris') && visitedTabs.has('sarpras-inventaris') && (
            <div className={activeTab === 'sarpras-inventaris' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <SarprasInventarisTab />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('sarpras-peminjaman') && visitedTabs.has('sarpras-peminjaman') && (
            <div className={activeTab === 'sarpras-peminjaman' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <SarprasPeminjamanTab />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('sarpras-perbaikan') && visitedTabs.has('sarpras-perbaikan') && (
            <div className={activeTab === 'sarpras-perbaikan' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <SarprasPerbaikanTab />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('sarpras-denah') && visitedTabs.has('sarpras-denah') && (
            <div className={activeTab === 'sarpras-denah' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
                <SarprasDenahTab />
              </Suspense>
            </div>
          )}

          {allowedTabIds.has('struktur_organisasi') && visitedTabs.has('struktur_organisasi') && (
            <div className={activeTab === 'struktur_organisasi' ? 'block animate-in fade-in duration-100' : 'hidden'}>
              <DivisiStrukturOrganisasiView
                divisionCode="TU_KEPALA"
                divisionTitle="Struktur Organisasi Tata Usaha"
                hideLayout={true}
              />
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
