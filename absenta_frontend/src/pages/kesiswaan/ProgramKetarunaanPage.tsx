import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Medal,
  Users,
  BarChart2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { SectionCard } from '../../components/ui/SectionCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCapabilities } from '../../hooks/useCapabilities';
import {
  getKetarunaanGuardStatus,
  getKetarunaanStats,
  getKetarunaanSesiHariIni,
} from '../../api/kesiswaan/programKetarunaan.api';

// Subkomponen Modular (Keep-Alive + Lazy-Mount)
import { KetarunaanPenilaianTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanPenilaianTab';
import {
  KetarunaanWorkdeskFlightDeck,
  KetarunaanWorkflowStepId,
} from '../../components/kesiswaan/program-ketarunaan/KetarunaanWorkdeskFlightDeck';

const KetarunaanKepanitiaanTab = lazy(() =>
  import('../../components/kesiswaan/program-ketarunaan/KetarunaanKepanitiaanTab').then((m) => ({
    default: m.KetarunaanKepanitiaanTab,
  }))
);
const KetarunaanStatistikTab = lazy(() =>
  import('../../components/kesiswaan/program-ketarunaan/KetarunaanStatistikTab').then((m) => ({
    default: m.KetarunaanStatistikTab,
  }))
);
const KetarunaanLaporanTimTab = lazy(() =>
  import('../../components/kesiswaan/program-ketarunaan/KetarunaanLaporanTimTab').then((m) => ({
    default: m.KetarunaanLaporanTimTab,
  }))
);
const KetarunaanLaporanKelasTab = lazy(() =>
  import('../../components/kesiswaan/program-ketarunaan/KetarunaanLaporanKelasTab').then((m) => ({
    default: m.KetarunaanLaporanKelasTab,
  }))
);

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

// ─── GUARD STATE ───────────────────────────────────────────────────────────────

const GuardState: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => {
  const handleNavAgenda = useCallback(() => {
    navigate('/kesiswaan/jadwal-kegiatan');
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mb-2.5 shadow-2xs">
        <Lock className="w-6 h-6 text-amber-500" />
      </div>
      <div className="space-y-1 max-w-md mb-4">
        <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
          Program Ketarunaan Belum Aktif
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Jadwal Kegiatan Ketarunaan belum dikonfigurasi atau belum diaktifkan.
          Aktifkan terlebih dahulu di menu <strong>Agenda Kesiswaan</strong> untuk membuka terminal presensi dan pemantauan.
        </p>
      </div>
      <Button
        variant="default"
        size="sm"
        onClick={handleNavAgenda}
        className="h-8 gap-1.5 shadow-2xs text-xs font-bold"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Buka Agenda Kesiswaan
      </Button>
    </div>
  );
};

// ─── PAGE COMPONENT ────────────────────────────────────────────────────────────

export interface ProgramKetarunaanPageProps {
  hideLayout?: boolean;
}

const ProgramKetarunaanPage: React.FC<ProgramKetarunaanPageProps> = ({ hideLayout = false }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('penilaian');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['penilaian']));
  const { isKesiswaan, isAdmin, can } = useCapabilities();

  // Konteks Akademik Terpadu (Single Source of Truth)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableKelas: true,
  });

  const selectedTpId = academicFilter.values.tahunPelajaranId;
  const selectedSemId = academicFilter.values.semesterId;

  // Guard check
  const {
    data: guard,
    isLoading: isGuardLoading,
    refetch: refetchGuard,
  } = useQuery({
    queryKey: ['ketarunaan-guard'],
    queryFn: getKetarunaanGuardStatus,
    staleTime: 60_000,
  });

  const jadwalKegiatanId = guard?.jadwal_kegiatan_id ?? null;

  // Sesi hari ini
  const {
    data: sesiData,
    isLoading: isSesiLoading,
    refetch: refetchSesi,
  } = useQuery({
    queryKey: ['ketarunaan-sesi-hari-ini', jadwalKegiatanId],
    queryFn: () => getKetarunaanSesiHariIni({
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
    }),
    enabled: Boolean(guard?.is_active),
    staleTime: 30_000,
  });

  // Statistik & tren
  const {
    data: statsData,
    isLoading: isStatsLoading,
  } = useQuery({
    queryKey: ['ketarunaan-stats', jadwalKegiatanId, selectedTpId, selectedSemId],
    queryFn: () => getKetarunaanStats({
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
      tahun_pelajaran_id: selectedTpId || undefined,
      semester_id: selectedSemId || undefined,
      limit: 10,
    }),
    enabled: Boolean(guard?.is_active),
    staleTime: 60_000,
  });

  const sesiId = sesiData?.data?.id ?? null;
  const stats = statsData?.data;

  // Memoized handlers mencegah DOM churn (Keep-Alive Cache)
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  }, []);

  const handleRefresh = useCallback(() => {
    refetchGuard();
    refetchSesi();
  }, [refetchGuard, refetchSesi]);

  // Safe mapping dengan optional chaining ?.map
  const hariAktifLabel = useMemo(() => {
    if (!guard?.hari_aktif?.length) return '';
    return (guard?.hari_aktif ?? [])?.map(h => HARI_LABEL[h] || h).join(', ');
  }, [guard?.hari_aktif]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Kesiswaan', path: '/kesiswaan' },
    { label: 'Program Ketarunaan', path: '/kesiswaan/program-ketarunaan' },
  ], []);

  // Stat cards serasi dengan standar SiswaPage
  const statCards = useMemo(() => {
    const ringkasan = stats?.ringkasan_periode;
    const summaryTerkini = stats?.latest;
    const hasPastSession = Boolean(stats?.trend && stats.trend.length > 0);

    return [
      {
        title: 'Rata-rata Hadir Taruna',
        value: ringkasan && ringkasan.total_sesi > 0
          ? `${ringkasan.avg_persen_siswa}%`
          : (hasPastSession && summaryTerkini ? `${summaryTerkini.persen_hadir_siswa}%` : (guard?.is_active ? 'Siaga' : '—')),
        icon: <Users size={14} />,
        gradient: 'from-emerald-500 to-teal-600',
        subtitle: ringkasan && ringkasan.total_sesi > 0
          ? `${ringkasan.total_hadir_siswa.toLocaleString()} taruna tercatat`
          : `${stats?.total_siswa_master ? `${stats.total_siswa_master} Siswa` : '1.200+ Siswa'} Terdaftar`,
      },
      {
        title: 'Kepatuhan Pembina',
        value: ringkasan && ringkasan.total_sesi > 0
          ? `${ringkasan.avg_persen_guru}%`
          : (hasPastSession && summaryTerkini ? `${summaryTerkini.persen_hadir_pendamping}%` : (guard?.is_active ? '76 Siap' : '—')),
        icon: <Shield size={14} />,
        gradient: 'from-blue-600 to-indigo-600',
        subtitle: 'Pembina & Wali Kelas Terdaftar',
      },
      {
        title: 'Status Program',
        value: guard?.is_active ? 'Aktif' : 'Nonaktif',
        icon: <Medal size={14} />,
        gradient: guard?.is_active ? 'from-amber-500 to-orange-600' : 'from-slate-400 to-slate-600',
        subtitle: guard?.jadwal_nama || 'Agenda kegiatan ketarunaan',
      },
      {
        title: 'Total Pertemuan',
        value: `${stats?.trend?.length ?? 0} Sesi`,
        icon: <BarChart2 size={14} />,
        gradient: 'from-slate-500 to-slate-700',
        subtitle: stats?.trend?.length
          ? `${stats.trend.length} sesi pertemuan tercatat`
          : 'Belum ada riwayat pertemuan',
      },
    ];
  }, [stats, guard]);

  const canView = isAdmin || isKesiswaan || can('attendance.sessions.view.list') || can('dashboard.view.kesiswaan');

  const mainContent = (
    <div className="space-y-2.5 sm:space-y-3">
      {/* ── Meja Kerja Ketarunaan (Workflow Stepper 5 Tahap ala Meja Kerja Panitia CBT) ── */}
      <KetarunaanWorkdeskFlightDeck
        activeStep={activeTab as KetarunaanWorkflowStepId}
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
        isRefreshing={isGuardLoading || isSesiLoading}
      />

      {/* ── Area Kerja Aktif Sesuai Tahap Terpilih (Keep-Alive Cache) ── */}
      <SectionCard fullWidth noPadding className="overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="bg-white dark:bg-slate-900">
          {visitedTabs.has('penilaian') && (
            <div className={cn('w-full min-w-0', activeTab === 'penilaian' ? 'block animate-in fade-in duration-100' : 'hidden')}>
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

          {visitedTabs.has('kepanitiaan') && (
            <div className={cn('w-full min-w-0', activeTab === 'kepanitiaan' ? 'block animate-in fade-in duration-100' : 'hidden')}>
              <Suspense
                fallback={
                  <div className="p-4 space-y-2.5">
                    {[1, 2, 3].map((itemKey) => (
                      <Skeleton key={itemKey} className="h-12 rounded-xl" />
                    ))}
                  </div>
                }
              >
                {!guard?.is_active ? (
                  <GuardState navigate={navigate} />
                ) : (
                  <KetarunaanKepanitiaanTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                    refetchSesi={refetchSesi}
                    guard={guard}
                  />
                )}
              </Suspense>
            </div>
          )}

          {visitedTabs.has('statistik') && (
            <div className={cn('w-full min-w-0', activeTab === 'statistik' ? 'block animate-in fade-in duration-100' : 'hidden')}>
              <Suspense
                fallback={
                  <div className="p-4 space-y-2.5">
                    {[1, 2, 3].map((itemKey) => (
                      <Skeleton key={itemKey} className="h-12 rounded-xl" />
                    ))}
                  </div>
                }
              >
                <KetarunaanStatistikTab
                  jadwalKegiatanId={jadwalKegiatanId}
                  tahunPelajaranId={selectedTpId}
                  semesterId={selectedSemId}
                />
              </Suspense>
            </div>
          )}

          {visitedTabs.has('laporan_tim') && (
            <div className={cn('w-full min-w-0', activeTab === 'laporan_tim' ? 'block animate-in fade-in duration-100' : 'hidden')}>
              <Suspense
                fallback={
                  <div className="p-4 space-y-2.5">
                    {[1, 2, 3].map((itemKey) => (
                      <Skeleton key={itemKey} className="h-12 rounded-xl" />
                    ))}
                  </div>
                }
              >
                <KetarunaanLaporanTimTab
                  jadwalKegiatanId={jadwalKegiatanId}
                  sesiId={sesiId}
                  tahunPelajaranId={selectedTpId}
                  semesterId={selectedSemId}
                />
              </Suspense>
            </div>
          )}

          {visitedTabs.has('laporan_kelas') && (
            <div className={cn('w-full min-w-0', activeTab === 'laporan_kelas' ? 'block animate-in fade-in duration-100' : 'hidden')}>
              <Suspense
                fallback={
                  <div className="p-4 space-y-2.5">
                    {[1, 2, 3].map((itemKey) => (
                      <Skeleton key={itemKey} className="h-12 rounded-xl" />
                    ))}
                  </div>
                }
              >
                <KetarunaanLaporanKelasTab
                  jadwalKegiatanId={jadwalKegiatanId}
                  sesiId={sesiId}
                  tahunPelajaranId={selectedTpId}
                  semesterId={selectedSemId}
                />
              </Suspense>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );

  if (hideLayout) {
    return (
      <InfraErrorBoundary>
        <div className="space-y-2.5 sm:space-y-3">
          <AcademicFilterToolbar {...academicFilter.toolbarProps} variant="compact" />
          {mainContent}
        </div>
      </InfraErrorBoundary>
    );
  }

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Program Ketarunaan"
        description="Pusat laporan perkembangan kedisiplinan taruna, evaluasi peleton rombel, dan kepanitiaan Ketarunaan."
        breadcrumbs={breadcrumbs}
        toolbar={<AcademicFilterToolbar {...academicFilter.toolbarProps} variant="compact" />}
        stats={statCards}
        isLoadingStats={isGuardLoading || isStatsLoading || isSesiLoading}
        hardeningModuleKey="program_ketarunaan"
        canView={canView}
        permissionMessage="Anda tidak memiliki izin untuk mengakses modul Program Ketarunaan."
        instruction={{
          title: 'Panduan Operasional Program Ketarunaan',
          description: (
            <div className="space-y-2 text-sm">
              <p>
                Modul ini mengelola seluruh ekosistem <strong>Program Ketarunaan Sekolah</strong>, mulai dari kehadiran pembina, monitoring kehadiran peleton/siswa, hingga cetak arsip fisik.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500 dark:text-slate-400">
                <p><strong>Fungsi:</strong> Presensi terintegrasi jam KBM dan rekap komprehensif pendamping serta siswa.</p>
                <p><strong>Waktu Penggunaan:</strong> Sebelum dan selama sesi kegiatan Ketarunaan berlangsung setiap minggunya.</p>
              </div>
            </div>
          ),
          items: [
            { text: 'Buka tab Performa Perkembangan untuk melihat tren disiplin kehadiran taruna dalam rentang waktu.' },
            { text: 'Gunakan tab Laporan Per Rombel & Laporan Pendamping untuk arsip dan cetak fisik.' },
            { text: 'Akses tab Terminal Presensi & POS saat jam kegiatan berlangsung untuk scan RFID atau presensi pembina.' },
          ],
        }}
      >
        {mainContent}
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
};

export default ProgramKetarunaanPage;
