import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard,
  Users, 
  CalendarCheck, 
  BookOpen, 
  FileCheck2, 
  ShieldAlert, 
  Award, 
  FileSpreadsheet,
  GraduationCap,
  Loader
} from 'lucide-react';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useWalasDashboardData } from './walikelas/useWalasDashboardData';
import type { WaliKelasTabId } from './walikelas/types';
import { WalasBerandaTab } from './walikelas/tabs/WalasBerandaTab';
import { WalasSiswaTab } from './walikelas/tabs/WalasSiswaTab';
import { WalasPresensiTab } from './walikelas/tabs/WalasPresensiTab';
import { WalasJurnalTab } from './walikelas/tabs/WalasJurnalTab';
import { WalasIzinTab } from './walikelas/tabs/WalasIzinTab';
import { WalasDisiplinTab } from './walikelas/tabs/WalasDisiplinTab';
import { WalasPrestasiTab } from './walikelas/tabs/WalasPrestasiTab';
import { WalasRekapTab } from './walikelas/tabs/WalasRekapTab';
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
  const subtabParam = searchParams.get('subtab') as WaliKelasTabId | null;

  const validTabs: WaliKelasTabId[] = [
    'ringkasan', 'siswa', 'presensi', 'jurnal', 'izin', 'disiplin', 'prestasi', 'rekap'
  ];

  // Active Tab State
  const [activeTab, setActiveTab] = useState<WaliKelasTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      setActiveTab(subtabParam);
    }
  }, [subtabParam]);

  const handleTabSelect = useCallback((tabId: WaliKelasTabId) => {
    setActiveTab(tabId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tabId === 'ringkasan') {
        next.delete('subtab');
      } else {
        next.set('subtab', tabId);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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

  // Tab Definitions with dynamic badges matching Kaprog's nav tabs
  const navTabs = useMemo(() => {
    const pendingIzin = walasData?.permohonanIzinSummary?.pending ?? 0;
    const totalAlfa = walasData?.kehadiranStats?.alfa ?? 0;
    const totalCases = walasData?.pelanggaranSummary?.totalCases ?? 0;

    return [
      { id: 'ringkasan' as WaliKelasTabId, label: 'Ringkasan', icon: LayoutDashboard },
      { id: 'siswa' as WaliKelasTabId, label: 'Data Siswa', icon: Users },
      { 
        id: 'presensi' as WaliKelasTabId, 
        label: 'Presensi Rombel', 
        icon: CalendarCheck, 
        badge: totalAlfa > 0 ? `${totalAlfa}` : undefined 
      },
      { id: 'jurnal' as WaliKelasTabId, label: 'Jurnal Walas', icon: BookOpen },
      { 
        id: 'izin' as WaliKelasTabId, 
        label: 'Persetujuan Izin', 
        icon: FileCheck2, 
        badge: pendingIzin > 0 ? `${pendingIzin}` : undefined 
      },
      { 
        id: 'disiplin' as WaliKelasTabId, 
        label: 'Pelanggaran Siswa', 
        icon: ShieldAlert, 
        badge: totalCases > 0 ? `${totalCases}` : undefined 
      },
      { id: 'prestasi' as WaliKelasTabId, label: 'Prestasi Siswa', icon: Award },
      { id: 'rekap' as WaliKelasTabId, label: 'Cetak & Rekap', icon: FileSpreadsheet },
    ];
  }, [walasData]);

  const handleClassChange = (newKelasId: string) => {
    setSelectedKelasId(newKelasId);
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-5">
      {/* 1. Mobile Top Controls (< lg only: Identity + Filter + Tab Pills) */}
      <div className="flex lg:hidden flex-col gap-3">
        {/* Mobile Identity Bar */}
        <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                {activeKelasNama}
              </h2>
            </div>
          </div>

          {kelasList.length > 1 && (
            <select
              value={activeKelasId || ''}
              onChange={(e) => handleClassChange(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2 py-1"
            >
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Mobile Academic Filter Toolbar */}
        <AcademicFilterToolbar
          {...academicFilter.toolbarProps}
          variant="compact"
          className="w-full"
        />

        {/* Mobile Nav Pill Row */}
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
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                      isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
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

      {/* 2. Desktop 2-Column Layout (>= lg: Left Sidebar Controls + Wide Main Content Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Sidebar Controls (Desktop sticky) */}
        <aside className="hidden lg:block sticky top-20 space-y-3">
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
                        'px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-bold'
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
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader size="md" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Memuat data operasional rombel...
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + (activeKelasId || '')}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="w-full"
              >
                {activeTab === 'ringkasan' && (
                  <WalasBerandaTab
                    data={walasData}
                    isLoading={isLoading}
                    onSelectTab={handleTabSelect}
                    onOpenJurnalModal={() => handleTabSelect('jurnal')}
                  />
                )}

                {activeTab === 'siswa' && (
                  <WalasSiswaTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    tahunPelajaranId={walasData?.tahun_pelajaran?.id}
                    semesterId={walasData?.tahun_pelajaran?.semester}
                    data={walasData}
                  />
                )}

                {activeTab === 'presensi' && (
                  <WalasPresensiTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                    onOpenRujukanModal={() => handleTabSelect('disiplin')}
                  />
                )}

                {activeTab === 'jurnal' && (
                  <WalasJurnalTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                )}

                {activeTab === 'izin' && (
                  <WalasIzinTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                )}

                {activeTab === 'disiplin' && (
                  <WalasDisiplinTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                )}

                {activeTab === 'prestasi' && (
                  <WalasPrestasiTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                )}

                {activeTab === 'rekap' && (
                  <WalasRekapTab
                    kelasId={activeKelasId}
                    kelasNama={activeKelasNama}
                    data={walasData}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
};

export default WaliKelasDashboard;
