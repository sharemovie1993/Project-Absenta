import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Users, 
  CalendarCheck, 
  BookOpen, 
  FileCheck2, 
  ShieldAlert, 
  Award, 
  FileSpreadsheet,
  History,
  AlertTriangle,
  RefreshCw,
  Building,
  School
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useWalasDashboardData } from './walikelas/useWalasDashboardData';
import type { WaliKelasTabId, WalasDashboardData } from './walikelas/types';
import { WalasBerandaTab } from './walikelas/tabs/WalasBerandaTab';
import { WalasSiswaTab } from './walikelas/tabs/WalasSiswaTab';
import { WalasPresensiTab } from './walikelas/tabs/WalasPresensiTab';
import { WalasJurnalTab } from './walikelas/tabs/WalasJurnalTab';
import { WalasIzinTab } from './walikelas/tabs/WalasIzinTab';
import { WalasDisiplinTab } from './walikelas/tabs/WalasDisiplinTab';
import { WalasPrestasiTab } from './walikelas/tabs/WalasPrestasiTab';
import { WalasRekapTab } from './walikelas/tabs/WalasRekapTab';

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
  const [selectedKelasId, setSelectedKelasId] = useState<string | undefined>(initialKelasId);
  const [activeTab, setActiveTab] = useState<WaliKelasTabId>('ringkasan');

  // Sync initial props
  useEffect(() => {
    if (initialKelasId && !selectedKelasId) {
      setSelectedKelasId(initialKelasId);
    }
  }, [initialKelasId, selectedKelasId]);

  // SSOT Walas Data Query
  const { 
    data: walasData, 
    isLoading, 
    refetch, 
    isFetching 
  } = useWalasDashboardData({
    targetKelasId: selectedKelasId,
    enabled: true,
  });

  // Effective Class Info
  const activeKelasId = selectedKelasId || walasData?.kelasInfo?.id;
  const activeKelasNama = walasData?.kelasInfo?.nama_kelas || initialKelasNama || 'Kelas Binaan';
  const isHistorical = walasData?.academicContext?.isHistoricalPeriod ?? false;
  const kelasList = walasData?.kelas_binaan_list || [];

  // Tab Definitions with dynamic badges
  const navTabs = useMemo(() => {
    const pendingIzin = walasData?.permohonanIzinSummary?.pending ?? 0;
    const totalAlfa = walasData?.kehadiranStats?.alfa ?? 0;
    const totalCases = walasData?.pelanggaranSummary?.totalCases ?? 0;

    return [
      { id: 'ringkasan' as WaliKelasTabId, label: 'Beranda Rombel', icon: GraduationCap, badge: null },
      { id: 'siswa' as WaliKelasTabId, label: 'Data Siswa', icon: Users, badge: null },
      { 
        id: 'presensi' as WaliKelasTabId, 
        label: 'Presensi & Kehadiran', 
        icon: CalendarCheck, 
        badge: totalAlfa > 0 ? `${totalAlfa} Alfa` : null,
        badgeVariant: 'warning' as const
      },
      { id: 'jurnal' as WaliKelasTabId, label: 'Jurnal Walas', icon: BookOpen, badge: null },
      { 
        id: 'izin' as WaliKelasTabId, 
        label: 'Persetujuan Izin', 
        icon: FileCheck2, 
        badge: pendingIzin > 0 ? `${pendingIzin} Baru` : null,
        badgeVariant: 'error' as const
      },
      { 
        id: 'disiplin' as WaliKelasTabId, 
        label: 'Disiplin & BK', 
        icon: ShieldAlert, 
        badge: totalCases > 0 ? `${totalCases}` : null,
        badgeVariant: 'neutral' as const
      },
      { id: 'prestasi' as WaliKelasTabId, label: 'Prestasi Rombel', icon: Award, badge: null },
      { id: 'rekap' as WaliKelasTabId, label: 'Cetak & Rekap', icon: FileSpreadsheet, badge: null },
    ];
  }, [walasData]);

  const handleClassChange = (newKelasId: string) => {
    setSelectedKelasId(newKelasId);
  };

  return (
    <div className="w-full max-w-full space-y-6 min-w-0">
      {/* 1. TOP HEADER & HISTORICAL CONTEXT SWITCHER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary-600/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Wali Kelas: {activeKelasNama}
              </h2>
              {isHistorical ? (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px] font-bold">
                  <History className="w-3 h-3 mr-1 inline" />
                  Mode Arsip Historis
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 text-[10px] font-bold">
                  TP Aktif
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
              {walasData?.tahun_pelajaran?.nama || 'Tahun Ajaran'} • Semester {walasData?.tahun_pelajaran?.semester || '1'} 
              {walasData?.wali_kelas?.nama && ` • Pembina: ${walasData.wali_kelas.nama}`}
            </p>
          </div>
        </div>

        {/* Right Controls: Class Switcher & Refresh */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {kelasList.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <Building className="w-3.5 h-3.5 ml-2 text-slate-700 dark:text-slate-300 shrink-0" />
              <select
                value={activeKelasId || ''}
                onChange={(e) => handleClassChange(e.target.value)}
                className="text-xs bg-transparent border-0 text-slate-800 dark:text-slate-200 pr-3 py-1 focus:ring-0 focus:outline-hidden font-medium cursor-pointer"
              >
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                    {k.nama} ({k.tahun_pelajaran?.nama || 'TP'}{k.tahun_pelajaran?.is_active ? ' - Aktif' : ' - Arsip'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 h-9"
            title="Muat ulang data statistik rombel"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-primary-500' : ''}`} />
            <span className="hidden sm:inline text-xs">Sinkronkan</span>
          </Button>
        </div>
      </div>

      {/* 2. HISTORICAL PERIOD WARNING BANNER */}
      {isHistorical && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <span className="font-bold">Perhatian: Anda sedang meninjau data historis rombel masa lampau.</span>
            <span className="block text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Data presensi, jurnal, dan status siswa disajikan dalam mode baca saja (*Read-Only*) untuk kebutuhan penelusuran portofolio dan audit akreditasi.
            </span>
          </div>
        </div>
      )}

      {/* 3. HORIZONTAL TAB NAVIGATION (Pilar 30 Anti-Overlapping) */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max pb-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-500/5'
                    : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                    tab.badgeVariant === 'error' ? 'bg-red-500 text-white animate-pulse' :
                    tab.badgeVariant === 'warning' ? 'bg-amber-500 text-white' :
                    'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MODULAR TAB VIEWPORTS (Animated) */}
      <main className="w-full">
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
                onSelectTab={setActiveTab}
                onOpenJurnalModal={() => setActiveTab('jurnal')}
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
                onOpenRujukanModal={() => setActiveTab('disiplin')}
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
      </main>
    </div>
  );
};

export default WaliKelasDashboard;
