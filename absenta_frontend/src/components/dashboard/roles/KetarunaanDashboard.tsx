import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Medal,
  Shield,
  Users,
  BarChart2,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionCard } from '@/components/ui/SectionCard';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { UniversalEcosystemTopbar } from './common';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import {
  getKetarunaanGuardStatus,
  getKetarunaanStats,
  getKetarunaanSesiHariIni,
} from '@/api/kesiswaan/programKetarunaan.api';

// Subkomponen Modular Ketarunaan
import { KetarunaanKepanitiaanTab } from '@/components/kesiswaan/program-ketarunaan/KetarunaanKepanitiaanTab';
import { KetarunaanStatistikTab } from '@/components/kesiswaan/program-ketarunaan/KetarunaanStatistikTab';
import { KetarunaanLaporanTimTab } from '@/components/kesiswaan/program-ketarunaan/KetarunaanLaporanTimTab';
import { KetarunaanLaporanKelasTab } from '@/components/kesiswaan/program-ketarunaan/KetarunaanLaporanKelasTab';
import { KetarunaanPenilaianTab } from '@/components/kesiswaan/program-ketarunaan/KetarunaanPenilaianTab';
import {
  KetarunaanWorkdeskFlightDeck,
} from '@/components/kesiswaan/program-ketarunaan/KetarunaanWorkdeskFlightDeck';

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

export type KetarunaanSubtabId = 'penilaian' | 'statistik' | 'laporan_kelas' | 'laporan_tim' | 'kepanitiaan';

export interface KetarunaanDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const KetarunaanDashboard: React.FC<KetarunaanDashboardProps> = React.memo(() => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as KetarunaanSubtabId | null;

  const validTabs: KetarunaanSubtabId[] = ['penilaian', 'statistik', 'laporan_kelas', 'laporan_tim', 'kepanitiaan'];

  const [activeTab, setActiveTab] = useState<KetarunaanSubtabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'penilaian';
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize Tab with URL
  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam) && subtabParam !== activeTab) {
      setActiveTab(subtabParam);
    }
  }, [subtabParam, activeTab]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      const validId = tabId as KetarunaanSubtabId;
      setActiveTab(validId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'ketarunaan');
          next.set('subtab', validId);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Konteks Akademik Terpadu
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableKelas: true,
  });

  const selectedTpId = academicFilter.values.tahunPelajaranId;
  const selectedSemId = academicFilter.values.semesterId;

  // 1. Guard Status
  const { data: guard, isLoading: isGuardLoading, refetch: refetchGuard } = useQuery({
    queryKey: ['ketarunaan-guard'],
    queryFn: getKetarunaanGuardStatus,
    staleTime: 60 * 1000,
  });

  const jadwalKegiatanId = guard?.jadwal_kegiatan_id;

  // 2. Sesi Hari Ini
  const { data: sesiData, isLoading: isSesiLoading, refetch: refetchSesi } = useQuery({
    queryKey: ['ketarunaan-sesi-hari-ini', jadwalKegiatanId],
    queryFn: () =>
      getKetarunaanSesiHariIni({
        jadwal_kegiatan_id: jadwalKegiatanId,
        tanggal: new Date().toISOString().slice(0, 10),
      }),
    enabled: Boolean(guard?.is_active && jadwalKegiatanId),
    staleTime: 30 * 1000,
  });

  const sesiId = sesiData?.data?.id ?? (sesiData as any)?.sesi?.id ?? null;

  // 3. Stats Agregat
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['ketarunaan-stats', jadwalKegiatanId, selectedTpId, selectedSemId],
    queryFn: () =>
      getKetarunaanStats({
        jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
        tahun_pelajaran_id: selectedTpId || undefined,
        semester_id: selectedSemId || undefined,
      }),
    enabled: Boolean(guard?.is_active),
    staleTime: 60 * 1000,
  });

  const stats = statsData?.data ?? (statsData as any);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchGuard(), refetchSesi(), refetchStats()]);
    setIsRefreshing(false);
  };

  const hariAktifLabel = useMemo(() => {
    const list = guard?.hari_aktif || (guard as any)?.jadwal_hari || [];
    if (!list.length) return null;
    return list.map((h: string) => HARI_LABEL[h] || h).join(', ');
  }, [guard]);

  // Stat cards
  const statCards = useMemo(() => {
    const ringkasan = stats?.ringkasan_periode;
    const summaryTerkini = stats?.latest;
    const hasPastSession = Boolean(stats?.trend && stats.trend.length > 0);

    return [
      {
        title: 'Rata-rata Hadir Taruna',
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
            ? `${ringkasan.total_hadir_siswa.toLocaleString()} taruna tercatat`
            : `${stats?.total_siswa_master ? `${stats.total_siswa_master} Siswa` : 'Siswa'} Terdaftar`,
      },
      {
        title: 'Kepatuhan Pembina',
        value:
          ringkasan && ringkasan.total_sesi > 0
            ? `${ringkasan.avg_persen_guru}%`
            : hasPastSession && summaryTerkini
            ? `${summaryTerkini.persen_hadir_pendamping}%`
            : guard?.is_active
            ? 'Siaga'
            : '—',
        icon: Shield,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/80',
        subtitle: 'Pembina & Wali Kelas Terdaftar',
      },
      {
        title: 'Status Program',
        value: guard?.is_active ? 'Aktif' : 'Nonaktif',
        icon: Medal,
        color: guard?.is_active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500',
        bg: guard?.is_active
          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        subtitle: guard?.jadwal_nama || 'Agenda Ketarunaan',
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
        {/* Topbar Ekosistem Khusus Ketarunaan */}
        <UniversalEcosystemTopbar
          ecosystem="ketarunaan"
          title="Dashboard Ketarunaan"
          icon={Medal}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actions={
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/30">
                🎖️ TIM PEMBINA TARUNA
              </span>
            </div>
          }
        />

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

        {/* ── Meja Kerja Ketarunaan (Workflow Stepper 5 Tahap + Filter Akademik Terintegrasi) ── */}
        <KetarunaanWorkdeskFlightDeck
          activeStep={activeTab}
          onSelectStep={(step) => handleTabChange(step)}
          guard={guard}
          hariAktifLabel={hariAktifLabel}
          sesiId={sesiId}
          stats={stats}
          totalKelasCount={Math.max(1, (academicFilter.kelasOptions?.length || 1) - (academicFilter.toolbarProps.allowAllKelas ? 1 : 0))}
          selectedTahunPelajaranNama={academicFilter.selectedTahunPelajaranNama}
          selectedSemesterNama={academicFilter.selectedSemesterNama}
          selectedKelasLabel={academicFilter.selectedKelasLabel}
          onOpenSettings={() => navigate('/kesiswaan/jadwal-kegiatan')}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing || isGuardLoading || isSesiLoading}
          filterToolbarNode={<AcademicFilterToolbar {...academicFilter.toolbarProps} variant="compact" />}
        />

        {/* ── Area Kerja Aktif Sesuai Tahap Terpilih ── */}
        <SectionCard fullWidth noPadding className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
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
              {activeTab === 'penilaian' && (
                <div className="p-4 sm:p-6">
                  <KetarunaanPenilaianTab
                    tahunPelajaranId={selectedTpId}
                    tahunPelajaranNama={academicFilter.selectedTahunPelajaranNama}
                    semesterId={selectedSemId}
                    semesterNama={academicFilter.selectedSemesterNama}
                    kelasId={academicFilter.values.kelasId}
                    kelasNama={academicFilter.selectedKelasLabel}
                    jurusanId={academicFilter.values.jurusanId}
                  />
                </div>
              )}

              {activeTab === 'statistik' && (
                <div className="p-4 sm:p-6">
                  <KetarunaanStatistikTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    tahunPelajaranId={selectedTpId}
                    semesterId={selectedSemId}
                  />
                </div>
              )}

              {activeTab === 'laporan_kelas' && (
                <div className="p-4 sm:p-6">
                  <KetarunaanLaporanKelasTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                    tahunPelajaranId={selectedTpId}
                    semesterId={selectedSemId}
                  />
                </div>
              )}

              {activeTab === 'laporan_tim' && (
                <div className="p-4 sm:p-6">
                  <KetarunaanLaporanTimTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                    tahunPelajaranId={selectedTpId}
                    semesterId={selectedSemId}
                  />
                </div>
              )}

              {activeTab === 'kepanitiaan' && (
                <div className="p-4 sm:p-6">
                  {!guard?.is_active ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-amber-500" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        Program Ketarunaan Belum Aktif
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                        Jadwal kegiatan ketarunaan belum diaktifkan. Silakan hubungi Waka Kesiswaan atau aktifkan di Agenda Kesiswaan.
                      </p>
                    </div>
                  ) : (
                    <KetarunaanKepanitiaanTab
                      jadwalKegiatanId={jadwalKegiatanId}
                      sesiId={sesiId}
                      refetchSesi={refetchSesi}
                      guard={guard}
                    />
                  )}
                </div>
              )}
            </Suspense>
          </div>
        </SectionCard>
      </div>
    </InfraErrorBoundary>
  );
});

KetarunaanDashboard.displayName = 'KetarunaanDashboard';
export default KetarunaanDashboard;
