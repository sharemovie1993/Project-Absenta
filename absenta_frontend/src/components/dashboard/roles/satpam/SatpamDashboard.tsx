import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Scan, 
  UserCheck, 
  LogOut, 
  AlertTriangle, 
  Activity, 
  Clock, 
  RefreshCw,
  Camera,
  DoorOpen,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { getGerbangDashboardStats } from '@/api/dashboard.api';
import { piketApi } from '@/api/piket.api';

// Subcomponents
import { SatpamDashboardSkeleton } from './SatpamDashboardSkeleton';
import { SatpamScanGerbangTab } from './tabs/SatpamScanGerbangTab';
import { SatpamBukuTamuTab } from './tabs/SatpamBukuTamuTab';
import { SatpamIzinKeluarTab } from './tabs/SatpamIzinKeluarTab';
import { SatpamPelanggaranTab } from './tabs/SatpamPelanggaranTab';
import { SatpamTrafficTab } from './tabs/SatpamTrafficTab';
import { 
  UniversalMobileSubtabSidebar, 
  useMobileSubtabSidebar,
  UniversalEcosystemTopbar,
} from '../common';
import type { 
  SatpamTabType, 
  SatpamStats, 
  RecentScanRecord, 
  GuestLogRecord, 
  StudentGatePermit 
} from './types';

// Mock Seed Data
const MOCK_RECENT_TAPS: RecentScanRecord[] = [
  {
    id: 'tap-1',
    nama: 'Fahrizal Rahmat',
    nisn: '0058291824',
    kelas: 'XI RPL 1',
    status: 'HADIR',
    jam: '06:48:12',
    gate: 'Pos Gerbang Utama 1',
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'tap-2',
    nama: 'Anisa Maharani',
    nisn: '0058291825',
    kelas: 'XI RPL 1',
    status: 'HADIR',
    jam: '06:50:05',
    gate: 'Pos Gerbang Utama 1',
  },
  {
    id: 'tap-3',
    nama: 'Bagas Prasetyo',
    nisn: '0058291826',
    kelas: 'XII TKJ 2',
    status: 'HADIR',
    jam: '06:52:40',
    gate: 'Pos Gerbang Utama 1',
  },
  {
    id: 'tap-4',
    nama: 'Citra Dewi Permata',
    nisn: '0058291827',
    kelas: 'X DKV 1',
    status: 'HADIR',
    jam: '06:54:19',
    gate: 'Pos Gerbang Barat',
  },
  {
    id: 'tap-5',
    nama: 'Rian Pratama',
    nisn: '0061298411',
    kelas: 'X TJKT 2',
    status: 'TERLAMBAT',
    jam: '07:22:04',
    gate: 'Pos Gerbang Utama 1',
  },
];

const VALID_SATPAM_TABS: SatpamTabType[] = ['scan', 'buku_tamu', 'izin_keluar', 'pelanggaran', 'traffic'];

export const SatpamDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSubtab = searchParams.get('subtab') as SatpamTabType | null;
  const rawTab = searchParams.get('tab') as SatpamTabType | null;
  const currentTab: SatpamTabType = useMemo(() => {
    if (rawSubtab && VALID_SATPAM_TABS.includes(rawSubtab)) return rawSubtab;
    if (rawTab && VALID_SATPAM_TABS.includes(rawTab)) return rawTab;
    return 'scan';
  }, [rawSubtab, rawTab]);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSubtabSidebar('satpam');

  const handleTabChange = useCallback(
    (tabId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const parentTab = prev.get('tab') || 'satpam';
          next.set('tab', parentTab);
          if (tabId === 'scan') {
            next.delete('subtab');
          } else {
            next.set('subtab', tabId);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Queries
  const { data: statsRes, isLoading, refetch } = useQuery({
    queryKey: ['satpam-dashboard-stats'],
    queryFn: async () => {
      try {
        const res = await getGerbangDashboardStats();
        return res?.data || null;
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const satpamStats: SatpamStats = useMemo(() => {
    return {
      totalMasuk: statsRes?.hadir_hari_ini ?? statsRes?.total_masuk ?? 0,
      tepatWaktu: statsRes?.tepat_waktu ?? 0,
      terlambat: statsRes?.terlambat ?? 0,
      belumHadir: statsRes?.belum_hadir ?? 0,
      tamuDiSekolah: statsRes?.tamu_di_sekolah ?? 0,
      izinKeluarAktif: statsRes?.izin_keluar_aktif ?? 0,
      persentaseKehadiran: statsRes?.persentase ?? 0,
    };
  }, [statsRes]);

  const tabsConfig = useMemo(
    () => [
      { id: 'scan', label: 'Scan Gerbang', icon: Scan },
      { id: 'buku_tamu', label: 'Buku Tamu', icon: UserCheck, badge: satpamStats.tamuDiSekolah },
      { id: 'izin_keluar', label: 'Izin Keluar', icon: LogOut, badge: satpamStats.izinKeluarAktif },
      { id: 'pelanggaran', label: 'Pelanggaran', icon: AlertTriangle },
      { id: 'traffic', label: 'Trafik & Monitoring', icon: Activity },
    ],
    [satpamStats]
  );

  const currentSubtabTitle = useMemo(() => {
    switch (currentTab) {
      case 'scan': return 'Presensi Gerbang';
      case 'buku_tamu': return 'Buku Tamu';
      case 'izin_keluar': return 'Izin Keluar';
      case 'pelanggaran': return 'Pelanggaran Gerbang';
      case 'traffic': return 'Trafik Gerbang';
      default: return 'Pos Keamanan';
    }
  }, [currentTab]);

  if (isLoading) {
    return <SatpamDashboardSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1A. MOBILE TOPBAR TERKUNCI RAMPING (MURNI JUDUL + KEMBALI) ── */}
      <UniversalEcosystemTopbar
        ecosystem="satpam"
        title={currentSubtabTitle}
        icon={ShieldCheck}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        className="lg:hidden"
      />

      {/* ── 1B. HERO POS SATPAM BANNER (DESKTOP - THEME AWARE) ────────── */}
      <div className="hidden lg:block p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-600/20 text-rose-600 dark:text-rose-500 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0 shadow-xs dark:shadow-lg dark:shadow-rose-950/50">
              <ShieldCheck size={26} />
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-600/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40 uppercase">
                  POS SATPAM &amp; GERBANG KEAMANAN
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                  Terminal 01
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {user?.full_name || 'Petugas Satpam'} — Pos Utama
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                RFID &amp; Scan Online
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 px-2.5 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold"
            >
              <RefreshCw size={13} className={cn(isLoading && 'animate-spin text-teal-600 dark:text-teal-400')} />
            </Button>
          </div>
        </div>

        {/* ── BENTO QUICK STRIP ──────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800">
            <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Total Masuk</p>
            <p className="text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">{satpamStats.totalMasuk} Siswa</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800">
            <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Terlambat</p>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">{satpamStats.terlambat} Siswa</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800">
            <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Tamu Aktif</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{satpamStats.tamuDiSekolah} Orang</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800">
            <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Siswa di Luar</p>
            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{satpamStats.izinKeluarAktif} Izin</p>
          </div>
        </div>
      </div>

      <UniversalMobileSubtabSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        title="Pos Keamanan & Satpam"
        subtitle="Gerbang Utama & Terminal RFID"
        roleBadge="SATPAM"
        scope="satpam"
        roleIcon={ShieldCheck}
        tabs={tabsConfig}
        activeTab={currentTab}
        onSelectTab={handleTabChange}
      />

      <div className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xs overflow-x-auto no-scrollbar">
        <TabSwitcher
          tabs={tabsConfig}
          activeTab={currentTab}
          onChange={handleTabChange}
        />
      </div>

      {/* ── 3. TAB CONTENT PANELS ──────────────────────────── */}
      <div className="animate-in fade-in duration-150">
        {currentTab === 'scan' && (
          <SatpamScanGerbangTab
            initialActivities={statsRes?.recent_activities}
            onTapSuccess={() => refetch()}
          />
        )}

        {currentTab === 'buku_tamu' && (
          <SatpamBukuTamuTab onGuestChange={() => refetch()} />
        )}

        {currentTab === 'izin_keluar' && (
          <SatpamIzinKeluarTab onPermitChange={() => refetch()} />
        )}

        {currentTab === 'pelanggaran' && (
          <SatpamPelanggaranTab />
        )}

        {currentTab === 'traffic' && (
          <SatpamTrafficTab stats={satpamStats} onRefreshStats={() => refetch()} />
        )}
      </div>
    </div>
  );
};
