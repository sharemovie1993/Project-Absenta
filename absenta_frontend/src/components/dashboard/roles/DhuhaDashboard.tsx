import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Moon,
  Users,
  BarChart2,
  FileText,
  LayoutList,
  Lock,
  ExternalLink,
  RefreshCw,
  Clock,
  HeartHandshake,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionCard } from '@/components/ui/SectionCard';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { UniversalEcosystemTopbar } from './common';
import {
  getDhuhaGuardStatus,
  getDhuhaStats,
  getDhuhaSesiHariIni,
} from '@/api/kesiswaan/pembiasaanDhuha.api';

// Subkomponen Modular Pembiasaan Dhuha
import { DhuhaKepanitiaanTab } from '@/components/kesiswaan/pembiasaan-dhuha/DhuhaKepanitiaanTab';
import { DhuhaStatistikTab } from '@/components/kesiswaan/pembiasaan-dhuha/DhuhaStatistikTab';
import { DhuhaLaporanTimTab } from '@/components/kesiswaan/pembiasaan-dhuha/DhuhaLaporanTimTab';
import { DhuhaLaporanKelasTab } from '@/components/kesiswaan/pembiasaan-dhuha/DhuhaLaporanKelasTab';
import { KegiatanWajibPolicyPanel } from '@/components/attendance/kegiatan/KegiatanWajibPolicyPanel';

const HARI_LABEL: Record<string, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: "Jum'at",
  SABTU: 'Sabtu',
  AHAD: 'Ahad',
  MINGGU: 'Minggu',
};

function formatWaktu(w?: string | null) {
  if (!w) return '-';
  return w.length === 5 ? w : w.slice(0, 5);
}

export type DhuhaSubtabId = 'statistik' | 'laporan_kelas' | 'laporan_tim' | 'kepanitiaan' | 'aturan_presensi';

const TAB_OPTIONS = [
  { id: 'statistik', label: 'Performa & Jamaah', icon: BarChart2 },
  { id: 'laporan_kelas', label: 'Laporan Per Rombel', icon: LayoutList },
  { id: 'laporan_tim', label: 'Laporan Pendamping', icon: FileText },
  { id: 'kepanitiaan', label: 'Terminal Presensi & POS', icon: Users },
  { id: 'aturan_presensi', label: 'Aturan Presensi Guru', icon: Shield },
];

export interface DhuhaDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const DhuhaDashboard: React.FC<DhuhaDashboardProps> = React.memo(() => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as DhuhaSubtabId | null;

  const validTabs: DhuhaSubtabId[] = ['statistik', 'laporan_kelas', 'laporan_tim', 'kepanitiaan', 'aturan_presensi'];

  const [activeTab, setActiveTab] = useState<DhuhaSubtabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'statistik';
  });

  const [visitedTabs, setVisitedTabs] = useState<Set<DhuhaSubtabId>>(
    () => new Set([activeTab])
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize Tab with URL
  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam) && subtabParam !== activeTab) {
      setActiveTab(subtabParam);
    }
  }, [subtabParam, activeTab]);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      const validId = tabId as DhuhaSubtabId;
      setActiveTab(validId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'dhuha');
          next.set('subtab', validId);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // 1. Guard Status
  const { data: guard, isLoading: isGuardLoading, refetch: refetchGuard } = useQuery({
    queryKey: ['dhuha-guard'],
    queryFn: getDhuhaGuardStatus,
    staleTime: 60 * 1000,
  });

  const jadwalKegiatanId = guard?.jadwal_kegiatan_id;

  // 2. Sesi Hari Ini
  const { data: sesiData, isLoading: isSesiLoading, refetch: refetchSesi } = useQuery({
    queryKey: ['dhuha-sesi-hari-ini', jadwalKegiatanId],
    queryFn: () =>
      getDhuhaSesiHariIni({
        jadwal_kegiatan_id: jadwalKegiatanId,
        tanggal: new Date().toISOString().slice(0, 10),
      }),
    enabled: Boolean(guard?.is_active && jadwalKegiatanId),
    staleTime: 30 * 1000,
  });

  const sesiId = sesiData?.sesi?.id;

  // 3. Stats Agregat
  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dhuha-stats', jadwalKegiatanId],
    queryFn: () =>
      getDhuhaStats({
        jadwal_kegiatan_id: jadwalKegiatanId,
      }),
    enabled: Boolean(guard?.is_active && jadwalKegiatanId),
    staleTime: 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchGuard(), refetchSesi(), refetchStats()]);
    setIsRefreshing(false);
  };

  const hariAktifLabel = useMemo(() => {
    if (!guard?.jadwal_hari || guard.jadwal_hari.length === 0) return null;
    return guard.jadwal_hari.map((h: string) => HARI_LABEL[h] || h).join(', ');
  }, [guard?.jadwal_hari]);

  // Stat cards
  const statCards = useMemo(() => {
    const ringkasan = stats?.ringkasan_periode;
    const summaryTerkini = stats?.latest;
    const hasPastSession = Boolean(stats?.trend && stats.trend.length > 0);

    return [
      {
        title: 'Rata-rata Jamaah Siswa',
        value:
          ringkasan && ringkasan.total_sesi > 0
            ? `${ringkasan.avg_persen_siswa}%`
            : hasPastSession && summaryTerkini
            ? `${summaryTerkini.persen_hadir_siswa}%`
            : guard?.is_active
            ? 'Siaga'
            : '—',
        icon: Users,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80',
        subtitle:
          ringkasan && ringkasan.total_sesi > 0
            ? `${ringkasan.total_hadir_siswa.toLocaleString()} jamaah tercatat`
            : `${stats?.total_siswa_master ? `${stats.total_siswa_master} Siswa` : 'Siswa'} Terdaftar`,
      },
      {
        title: 'Kepatuhan Guru Pendamping',
        value:
          ringkasan && ringkasan.total_sesi > 0
            ? `${ringkasan.avg_persen_guru}%`
            : hasPastSession && summaryTerkini
            ? `${summaryTerkini.persen_hadir_pendamping}%`
            : guard?.is_active
            ? 'Siaga'
            : '—',
        icon: HeartHandshake,
        color: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800/80',
        subtitle: 'Guru Pendamping & Wali Kelas Terdaftar',
      },
      {
        title: 'Status Program',
        value: guard?.is_active ? 'Aktif' : 'Nonaktif',
        icon: Moon,
        color: guard?.is_active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500',
        bg: guard?.is_active
          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        subtitle: guard?.jadwal_nama || 'Agenda Pembiasaan Dhuha',
      },
      {
        title: 'Total Pertemuan',
        value: `${stats?.trend?.length ?? 0} Sesi`,
        icon: BarChart2,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/80',
        subtitle: stats?.trend?.length
          ? `${stats.trend.length} sesi pertemuan tercatat`
          : 'Belum ada riwayat pertemuan',
      },
    ];
  }, [stats, guard]);

  return (
    <InfraErrorBoundary>
      <div className="w-full space-y-4 sm:space-y-6 pb-12">
        {/* Topbar Ekosistem Khusus Pembiasaan Dhuha */}
        <UniversalEcosystemTopbar
          ecosystem="dhuha"
          title="Dashboard Pembiasaan Dhuha"
          icon={Moon}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actions={
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/30">
                🕌 ROHIS & PEMBIASAAN IBADAH
              </span>
            </div>
          }
        />

        {/* Hero Section: Status Jadwal & Jam Pelaksanaan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {guard?.jadwal_nama || 'Pembiasaan Sholat Dhuha Bersama'}
                </h2>
                {!guard?.is_active ? (
                  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                    Agenda Nonaktif
                  </Badge>
                ) : guard?.is_today_scheduled_day && guard?.is_within_time_window ? (
                  <Badge variant="success" className="text-[10px] animate-pulse">
                    ● Jamaah Sedang Berlangsung
                  </Badge>
                ) : guard?.is_today_scheduled_day ? (
                  <Badge variant="info" className="text-[10px]">
                    Hari Pelaksanaan
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-[10px]">
                    Siaga Terjadwal
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {hariAktifLabel ? `${hariAktifLabel} ` : ''}
                  {formatWaktu(guard?.jadwal_waktu_mulai)} – {formatWaktu(guard?.jadwal_waktu_selesai)} WIB
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {guard?.is_active && (
              <Button
                size="sm"
                variant={activeTab === 'kepanitiaan' ? 'default' : 'outline'}
                onClick={() => handleTabChange('kepanitiaan')}
                className="text-xs gap-1.5 h-8 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-2xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Terminal Presensi Jamaah</span>
              </Button>
            )}
          </div>
        </div>

        {/* 4 Kartu KPI Eksekutif */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((sc, idx) => {
            const Icon = sc.icon;
            return (
              <div
                key={idx}
                className={cn(
                  'p-3.5 sm:p-4 rounded-2xl border transition-all shadow-2xs space-y-2',
                  sc.bg
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400">
                    {sc.title}
                  </span>
                  <div className={cn('p-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-2xs', sc.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {isStatsLoading || isGuardLoading ? '...' : sc.value}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                    {sc.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigasi Subtab Dashboard */}
        <SectionCard fullWidth noPadding className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
          <div className="px-4 sm:px-6 pt-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="overflow-x-auto no-scrollbar">
              <TabSwitcher
                options={TAB_OPTIONS}
                activeTab={activeTab}
                onChange={handleTabChange}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900">
            <Suspense
              fallback={
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((itemKey) => (
                    <Skeleton key={itemKey} className="h-12 rounded-2xl" />
                  ))}
                </div>
              }
            >
              {activeTab === 'statistik' && (
                <div className="p-4 sm:p-6">
                  <DhuhaStatistikTab jadwalKegiatanId={jadwalKegiatanId} />
                </div>
              )}

              {activeTab === 'laporan_kelas' && (
                <div className="p-4 sm:p-6">
                  <DhuhaLaporanKelasTab jadwalKegiatanId={jadwalKegiatanId} sesiId={sesiId} />
                </div>
              )}

              {activeTab === 'laporan_tim' && (
                <div className="p-4 sm:p-6">
                  <DhuhaLaporanTimTab jadwalKegiatanId={jadwalKegiatanId} sesiId={sesiId} />
                </div>
              )}

              {activeTab === 'kepanitiaan' && (
                <div className="p-4 sm:p-6">
                  {!guard?.is_active ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        Pembiasaan Dhuha Belum Aktif
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                        Jadwal kegiatan pembiasaan dhuha belum diaktifkan. Silakan hubungi Waka Kesiswaan atau aktifkan di Agenda Kesiswaan.
                      </p>
                    </div>
                  ) : (
                    <DhuhaKepanitiaanTab
                      jadwalKegiatanId={jadwalKegiatanId}
                      sesiId={sesiId}
                      refetchSesi={refetchSesi}
                      guard={guard}
                    />
                  )}
                </div>
              )}

              {activeTab === 'aturan_presensi' && (
                <div className="p-4 sm:p-6">
                  <KegiatanWajibPolicyPanel scope="DHUHA" />
                </div>
              )}
            </Suspense>
          </div>
        </SectionCard>
      </div>
    </InfraErrorBoundary>
  );
});

DhuhaDashboard.displayName = 'DhuhaDashboard';
export default DhuhaDashboard;
