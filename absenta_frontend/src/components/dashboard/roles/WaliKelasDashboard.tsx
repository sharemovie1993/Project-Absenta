import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard,
  ArrowLeft,
  Users, 
  CalendarCheck, 
  BookOpen, 
  FileCheck2, 
  ShieldAlert, 
  Award, 
  FileSpreadsheet,
  GraduationCap,
  Printer,
  SlidersHorizontal,
  Shield,
  Radio,
} from 'lucide-react';
import { raporApi } from '@/api/rapor.api';
import { WalasDashboardSkeleton } from './walikelas/WalasDashboardSkeleton';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useWalasDashboardData } from './walikelas/useWalasDashboardData';
import type { WaliKelasTabId } from './walikelas/types';
import { WalasBerandaTab } from './walikelas/tabs/WalasBerandaTab';
import { WalasSiswaTab } from './walikelas/tabs/WalasSiswaTab';
import { WalasStrukturTab } from './walikelas/tabs/WalasStrukturTab';
import { WalasPresensiTab } from './walikelas/tabs/WalasPresensiTab';
import { WalasDeteksiDiniTab } from './walikelas/tabs/WalasDeteksiDiniTab';
import { TeacherRadarRemedialSubTab } from '@/components/dashboard/staff/beranda/TeacherRadarRemedialSubTab';
import { WalasJurnalTab } from './walikelas/tabs/WalasJurnalTab';
import { WalasIzinTab } from './walikelas/tabs/WalasIzinTab';
import { WalasDisiplinTab } from './walikelas/tabs/WalasDisiplinTab';
import { WalasPrestasiTab } from './walikelas/tabs/WalasPrestasiTab';
import { WalasRekapTab } from './walikelas/tabs/WalasRekapTab';
import { WalasCetakRaporTab } from './walikelas/tabs/WalasCetakRaporTab';
import { 
  UniversalMobileSubtabSidebar, 
  useMobileSubtabSidebar,
  UniversalEcosystemTopbar,
} from './common';
import {
  WALAS_CATEGORIES,
  getWalasNavTabs,
} from './walikelas/walasNavigation.config';
import { cn } from '@/lib/utils';

export interface WaliKelasDashboardProps {
  waliKelasNama?: string;
  kelasId?: string;
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const WaliKelasDashboard: React.FC<WaliKelasDashboardProps> = ({
  waliKelasNama: initialKelasNama,
  kelasId: initialKelasId,
  user,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const subtabParam = searchParams.get('subtab') as WaliKelasTabId | null;

  const validTabs: WaliKelasTabId[] = [
    'ringkasan', 'siswa', 'struktur', 'presensi', 'deteksi', 'ketuntasan', 'jurnal', 'izin', 'disiplin', 'prestasi', 'rekap', 'rapor'
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, openMobileSidebar } = useMobileSubtabSidebar('walas');

  // Active Tab State
  const [activeTab, setActiveTab] = useState<WaliKelasTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Catat tab yang pernah dibuka agar TIDAK DIHANCURKAN saat pindah tab (Instant 0ms Switch)
  const [visitedTabs, setVisitedTabs] = useState<Set<WaliKelasTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      setActiveTab((curr) => {
        if (curr !== subtabParam) return subtabParam;
        return curr;
      });
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    } else if (!subtabParam) {
      setActiveTab('ringkasan');
      setVisitedTabs((prev) => (prev.has('ringkasan') ? prev : new Set(prev).add('ringkasan')));
    }
  }, [subtabParam]);

  const handleTabSelect = useCallback((tabId: WaliKelasTabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => (prev.has(tabId) ? prev : new Set(prev).add(tabId)));

    const currentSubtab = searchParams.get('subtab') || 'ringkasan';
    if (currentSubtab !== tabId) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (tabId === 'ringkasan') {
          next.delete('subtab');
        } else {
          next.set('subtab', tabId);
        }
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Konteks Akademik Standard Platform (useAcademicFilter SSOT)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const [selectedKelasId, setSelectedKelasId] = useState<string | undefined>(initialKelasId);

  // Sync initial props
  useEffect(() => {
    if (initialKelasId && !selectedKelasId) {
      setSelectedKelasId(initialKelasId);
    }
  }, [initialKelasId, selectedKelasId]);

  // SSOT Walas Data Query terintegrasi dengan filter akademik
  const { 
    data: walasData, 
    isLoading, 
    isFetching 
  } = useWalasDashboardData({
    targetKelasId: selectedKelasId,
    tahunPelajaranId: academicFilter.values.tahunPelajaranId,
    semesterId: academicFilter.values.semesterId,
    enabled: true,
  });

  // Effective Class Info
  const activeKelasId = selectedKelasId || walasData?.kelasInfo?.id;
  const activeKelasNama = walasData?.kelasInfo?.nama_kelas || initialKelasNama || 'KELAS BINAAN';
  const kelasList = walasData?.kelas_binaan_list || [];

  // Query Radar Ketuntasan Nilai Rombel Walas (Khusus Counter Siswa Perlu Remedial)
  const { data: radarWalasRes } = useQuery({
    queryKey: ['rapor-radar-remedial-badge-walas', activeKelasId, academicFilter.values.tahunPelajaranId, academicFilter.values.semesterId],
    queryFn: () => raporApi.getRadarRemedial({
      kelas_id: activeKelasId,
      role_mode: 'walas',
      tahun_pelajaran_id: academicFilter.values.tahunPelajaranId,
      semester_id: academicFilter.values.semesterId,
      kkm: 70,
    }).catch(() => ({ success: true, data: null })),
    enabled: Boolean(activeKelasId),
    staleTime: 60 * 1000,
  });

  const walasPerluRemedialCount = radarWalasRes?.data?.stats?.total_perlu_remedial || 0;

  // Tab Definitions with dynamic badges matching Kaprog's nav tabs (SSOT Kanonikal - 100% DRY)
  const navTabs = useMemo(() => {
    // 1. Data Siswa: total siswa di rombel
    const totalSiswa = walasData?.kelasInfo?.totalSiswa || (walasData?.kelasInfo as any)?.total_siswa || 0;

    // 2. Presensi: Siswa tidak hadir hari ini atau early warning alert at-risk
    const alfa = walasData?.kehadiranStats?.alfa ?? 0;
    const sakit = walasData?.kehadiranStats?.sakit ?? 0;
    const izin = walasData?.kehadiranStats?.izin ?? 0;
    const terlambat = walasData?.kehadiranStats?.terlambat ?? 0;
    const tidakHadirToday = alfa + sakit + izin + terlambat;
    const atRiskCount = walasData?.earlyWarningAlerts?.length ?? 0;

    // 3. Jurnal Walas: total jurnal walas tercatat
    const totalJurnal = walasData?.totalJurnalWalasTercatat || (walasData as any)?.jurnalCount || 0;

    // 4. Persetujuan Izin: izin pending
    const pendingIzin = (walasData as any)?.izinPendingCount ?? (walasData as any)?.permohonanIzinSummary?.pending ?? 0;

    // 5. Pelanggaran Siswa: total pelanggaran siswa rombel periode ini
    const totalPelanggaran = (walasData as any)?.totalPelanggaranPeriodeIni ?? (walasData as any)?.pelanggaranSummary?.totalCases ?? 0;

    // 6. Prestasi Siswa: total prestasi siswa rombel periode ini
    const totalPrestasi = (walasData as any)?.totalPrestasiPeriodeIni ?? (walasData as any)?.prestasiCount ?? 0;

    return getWalasNavTabs({
      totalSiswa,
      tidakHadirToday,
      atRiskCount,
      remedialCount: walasPerluRemedialCount,
      totalJurnal,
      pendingIzin,
      totalPelanggaran,
      totalPrestasi,
    });
  }, [walasData, walasPerluRemedialCount]);

  const handleClassChange = (newKelasId: string) => {
    setSelectedKelasId(newKelasId);
  };

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'ringkasan': return 'Ringkasan Rombel';
      case 'siswa': return 'Data Siswa';
      case 'struktur': return 'Struktur Kelas';
      case 'presensi': return 'Presensi Rombel';
      case 'deteksi': return 'Deteksi Kerawanan';
      case 'ketuntasan': return 'Ketuntasan Belajar';
      case 'jurnal': return 'Jurnal KBM';
      case 'izin': return 'Verifikasi Izin';
      case 'disiplin': return 'Kedisiplinan';
      case 'prestasi': return 'Prestasi Siswa';
      case 'rekap': return 'Rekap Absensi';
      case 'rapor': return 'Rapor & Leger';
      default: return 'Kelas Binaan';
    }
  }, [activeTab]);

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 pb-28 sm:pb-8">
      {/* 1. Universal Topbar Terkunci Ramping (Murni Judul + Kembali) */}
      <UniversalEcosystemTopbar
        ecosystem="walas"
        title={currentSubtabTitle}
        icon={GraduationCap}
        className="lg:hidden"
        actions={
          <div className="flex items-center gap-1.5">
            {kelasList.length > 1 && (
              <select
                value={activeKelasId || ''}
                onChange={(e) => handleClassChange(e.target.value)}
                className="text-[11px] font-bold rounded-xl bg-white/20 text-white border border-white/30 px-2 py-1 backdrop-blur-xs cursor-pointer focus:outline-none"
              >
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id} className="text-slate-900 bg-white">
                    {k.nama}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShowMobileFilter((prev) => !prev)}
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0",
                showMobileFilter
                  ? "bg-white text-sky-800 shadow-xs"
                  : "bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs"
              )}
              title="Atur Periode Akademik"
              aria-label="Atur Periode Akademik"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        }
      />

      {/* Standalone Collapsible Mobile Filter Toolbar (Terpisah secara mandiri) */}
      {showMobileFilter && (
        <div className="lg:hidden p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            variant="compact"
            className="w-full"
          />
        </div>
      )}

      {/* Dedicated Universal Mobile Subtab Sidebar Drawer */}
      <UniversalMobileSubtabSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        title={activeKelasNama}
        subtitle={`${academicFilter.selectedTahunPelajaranNama || '2026/2027'} • ${academicFilter.selectedSemesterNama || 'Ganjil'}`}
        roleBadge="WALI KELAS"
        scope="walas"
        roleIcon={GraduationCap}
        tabs={navTabs}
        activeTab={activeTab}
        onSelectTab={(tabId) => handleTabSelect(tabId as WaliKelasTabId)}
        categories={WALAS_CATEGORIES}
      />

      {/* 2. Desktop 2-Column Layout (>= lg: Left Sidebar Controls + Wide Main Content Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Sidebar Controls (Desktop sticky & independent scroll without scrollbar UI) */}
        <aside className="hidden lg:block sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain no-scrollbar space-y-3 pb-6">
          {/* Identitas Rombel Ringkas & Minimalis */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                {activeKelasNama}
              </h2>
              {kelasList.length > 1 ? (
                <select
                  value={activeKelasId || ''}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full text-[11px] text-slate-500 dark:text-slate-400 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
                >
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id} className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {k.nama} ({k.tahun_pelajaran?.nama || 'TP'})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {walasData?.wali_kelas?.nama ? `Walas: ${walasData.wali_kelas.nama}` : 'Wali Kelas'}
                </p>
              )}
            </div>
          </div>

          {/* Academic Filter Toolbar (Sidebar Variant SSOT) */}
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            variant="sidebar"
          />

          {/* Navigasi Menu Vertikal Berstandar Kaprog */}
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
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] font-bold min-w-5 text-center transition-colors',
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

        {/* Main Content Area */}
        <main className="min-w-0 space-y-4">
          {isLoading && !walasData ? (
            <WalasDashboardSkeleton />
          ) : (
            <div className="relative w-full min-w-0">
              {/* Keep-Alive + Lazy-Mounted Tab Panes for True Instant Switching (<16ms, Zero DOM Destruction) */}
              {visitedTabs.has('ringkasan') && (
                <div
                  key="tab-ringkasan"
                  className={cn('w-full', activeTab === 'ringkasan' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasBerandaTab
                    data={walasData}
                    isLoading={isLoading}
                    onSelectTab={handleTabSelect}
                    onOpenJurnalModal={() => handleTabSelect('jurnal')}
                  />
                </div>
              )}

              {visitedTabs.has('siswa') && (
                <div
                  key="tab-siswa"
                  className={cn('w-full', activeTab === 'siswa' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasSiswaTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    tahunPelajaranId={academicFilter.values.tahunPelajaranId || walasData?.academicContext?.selectedTahunPelajaranId}
                    semesterId={academicFilter.values.semesterId || walasData?.academicContext?.selectedSemesterId}
                    data={walasData}
                  />
                </div>
              )}

              {visitedTabs.has('struktur') && (
                <div
                  key="tab-struktur"
                  className={cn('w-full', activeTab === 'struktur' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasStrukturTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                </div>
              )}

              {visitedTabs.has('presensi') && (
                <div
                  key="tab-presensi"
                  className={cn('w-full', activeTab === 'presensi' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasPresensiTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                    onOpenRujukanModal={() => handleTabSelect('disiplin')}
                    onNavigateToDeteksi={() => handleTabSelect('deteksi')}
                  />
                </div>
              )}

              {visitedTabs.has('deteksi') && (
                <div
                  key="tab-deteksi"
                  className={cn('w-full', activeTab === 'deteksi' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasDeteksiDiniTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                    onOpenRujukanModal={() => handleTabSelect('disiplin')}
                  />
                </div>
              )}

              {visitedTabs.has('ketuntasan') && (
                <div
                  key="tab-ketuntasan"
                  className={cn('w-full', activeTab === 'ketuntasan' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <TeacherRadarRemedialSubTab
                    roleMode="walas"
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    tahunPelajaranId={academicFilter.values.tahunPelajaranId || walasData?.academicContext?.selectedTahunPelajaranId}
                    semesterId={academicFilter.values.semesterId || walasData?.academicContext?.selectedSemesterId}
                  />
                </div>
              )}

              {visitedTabs.has('jurnal') && (
                <div
                  key="tab-jurnal"
                  className={cn('w-full', activeTab === 'jurnal' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasJurnalTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                </div>
              )}

              {visitedTabs.has('izin') && (
                <div
                  key="tab-izin"
                  className={cn('w-full', activeTab === 'izin' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasIzinTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                </div>
              )}

              {visitedTabs.has('disiplin') && (
                <div
                  key="tab-disiplin"
                  className={cn('w-full', activeTab === 'disiplin' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasDisiplinTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                </div>
              )}

              {visitedTabs.has('prestasi') && (
                <div
                  key="tab-prestasi"
                  className={cn('w-full', activeTab === 'prestasi' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasPrestasiTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                </div>
              )}

              {visitedTabs.has('rekap') && (
                <div
                  key="tab-rekap"
                  className={cn('w-full', activeTab === 'rekap' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasRekapTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                </div>
              )}

              {visitedTabs.has('rapor') && (
                <div
                  key="tab-rapor"
                  className={cn('w-full', activeTab === 'rapor' ? 'block animate-in fade-in duration-100' : 'hidden')}
                >
                  <WalasCetakRaporTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    tahunPelajaranId={academicFilter.values.tahunPelajaranId || walasData?.academicContext?.selectedTahunPelajaranId}
                    semesterId={academicFilter.values.semesterId || walasData?.academicContext?.selectedSemesterId}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default WaliKelasDashboard;
