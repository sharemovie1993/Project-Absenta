import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Medal,
  Users,
  BarChart2,
  Lock,
  ExternalLink,
  Activity,
  Radio,
  LayoutList,
  FileText,
  LayoutGrid,
  TableProperties,
  Clock,
  FileSpreadsheet,
  RefreshCw,
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
import { KetarunaanKepanitiaanTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanKepanitiaanTab';

const KetarunaanPenilaianTab = lazy(() =>
  import('../../components/kesiswaan/program-ketarunaan/KetarunaanPenilaianTab').then((m) => ({
    default: m.KetarunaanPenilaianTab,
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
const AttendanceStagingModal = lazy(() =>
  import('../../components/attendance/staging/AttendanceStagingModal').then((m) => ({
    default: m.AttendanceStagingModal,
  }))
);
const AttendanceStagingView = lazy(() =>
  import('../../components/attendance/staging/AttendanceStagingView').then((m) => ({
    default: m.AttendanceStagingView,
  }))
);
const HistoricalBackfillModal = lazy(() =>
  import('../../components/attendance/backfill/HistoricalBackfillModal').then((m) => ({
    default: m.HistoricalBackfillModal,
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

function formatWaktu(w?: string | null) {
  if (!w) return '-';
  return w.length === 5 ? w : w.slice(0, 5);
}

// ─── PAGE COMPONENT ────────────────────────────────────────────────────────────

export interface ProgramKetarunaanPageProps {
  hideLayout?: boolean;
}

const ProgramKetarunaanPage: React.FC<ProgramKetarunaanPageProps> = ({ hideLayout = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Default pertama kali ditampilkan adalah Terminal Presensi ('terminal_absensi')
  const [activeTab, setActiveTab] = useState<string>('terminal_absensi');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['terminal_absensi']));
  const [isStagingModalOpen, setIsStagingModalOpen] = useState(false);
  const [isBackfillModalOpen, setIsBackfillModalOpen] = useState(false);
  const { isKesiswaan, isAdmin, can } = useCapabilities();

  // Konteks Akademik Terpadu (Single Source of Truth)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableKelas: true,
  });

  const selectedTpId = academicFilter.values.tahunPelajaranId;
  const selectedSemId = academicFilter.values.semesterId;
  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';

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
    queryFn: () =>
      getKetarunaanSesiHariIni({
        jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
      }),
    enabled: Boolean(guard?.is_active),
    staleTime: 30_000,
  });

  // Statistik & tren
  const {
    data: statsData,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['ketarunaan-stats', jadwalKegiatanId, selectedTpId, selectedSemId],
    queryFn: () =>
      getKetarunaanStats({
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
    refetchStats();
  }, [refetchGuard, refetchSesi, refetchStats]);

  const hariAktifLabel = useMemo(() => {
    if (!guard?.hari_aktif?.length) return '';
    return (guard?.hari_aktif ?? [])?.map((h) => HARI_LABEL[h] || h).join(', ');
  }, [guard?.hari_aktif]);

  const breadcrumbs = useMemo(
    () => [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Kesiswaan', path: '/kesiswaan' },
      { label: 'Program Ketarunaan', path: '/kesiswaan/program-ketarunaan' },
    ],
    []
  );

  const navTabs = useMemo(() => {
    const totalPertemuan = stats?.trend?.length ?? 0;
    const avgPersenSiswa = stats?.ringkasan_periode?.avg_persen_siswa ?? stats?.latest?.persen_hadir_siswa ?? null;
    const shortKelasLabel = academicFilter.selectedKelasLabel
      ? academicFilter.selectedKelasLabel.split(' - ')[0].trim()
      : undefined;

    return [
      {
        id: 'ringkasan',
        label: 'Ringkasan',
        icon: Activity,
        badge: totalPertemuan > 0 ? `${totalPertemuan} Sesi` : undefined,
      },
      {
        id: 'terminal_absensi',
        label: 'Terminal Absensi',
        icon: Radio,
        badge: sesiId ? 'Aktif' : undefined,
        badgeColor: 'bg-emerald-500 text-white',
      },
      {
        id: 'penilaian',
        label: 'Penilaian',
        icon: Medal,
        badge: shortKelasLabel,
      },
      {
        id: 'laporan_kelas',
        label: 'Rekap Rombel',
        icon: LayoutList,
        badge: avgPersenSiswa !== null ? `${avgPersenSiswa}%` : undefined,
      },
      {
        id: 'laporan_tim',
        label: 'Pembina & Walas',
        icon: FileText,
      },
      {
        id: 'struktur_organisasi',
        label: 'Bagan Struktur Organisasi',
        icon: LayoutGrid,
      },
      {
        id: 'ploting_panitia',
        label: 'Tabel Ploting Panitia',
        icon: TableProperties,
      },
      {
        id: 'backfill_presensi',
        label: 'Rekap Backfill & Staging',
        icon: FileSpreadsheet,
        badge: 'Guard',
        badgeColor: 'bg-amber-500 text-white',
      },
    ];
  }, [stats, sesiId, academicFilter.selectedKelasLabel]);

  // Stat cards serasi dengan standar SiswaPage
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
        icon: <Users size={14} />,
        gradient: 'from-emerald-500 to-teal-600',
        subtitle:
          ringkasan && ringkasan.total_sesi > 0
            ? `${ringkasan.total_hadir_siswa.toLocaleString()} taruna tercatat`
            : `${stats?.total_siswa_master ? `${stats.total_siswa_master} Siswa` : '1.200+ Siswa'} Terdaftar`,
      },
      {
        title: 'Kepatuhan Pembina',
        value:
          ringkasan && ringkasan.total_sesi > 0
            ? `${ringkasan.avg_persen_guru}%`
            : hasPastSession && summaryTerkini
            ? `${summaryTerkini.persen_hadir_pendamping}%`
            : guard?.is_active
            ? '76 Siap'
            : '—',
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

  const canView =
    isAdmin || isKesiswaan || can('attendance.sessions.view.list') || can('dashboard.view.kesiswaan');

  const tabPanelsNode = (
    <SectionCard fullWidth noPadding className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
      <div className="bg-white dark:bg-slate-900">
        {visitedTabs.has('ringkasan') && (
          <div className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block animate-in fade-in duration-100' : 'hidden')}>
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

        {visitedTabs.has('terminal_absensi') && (
          <div className={cn('w-full min-w-0', activeTab === 'terminal_absensi' ? 'block animate-in fade-in duration-100' : 'hidden')}>
            <KetarunaanKepanitiaanTab
              jadwalKegiatanId={jadwalKegiatanId}
              sesiId={sesiId}
              refetchSesi={refetchSesi}
              guard={guard}
              mode="PRESENSI"
            />
          </div>
        )}

        {visitedTabs.has('penilaian') && (
          <div className={cn('w-full min-w-0', activeTab === 'penilaian' ? 'block animate-in fade-in duration-100' : 'hidden')}>
            <Suspense
              fallback={
                <div className="p-4 space-y-2.5">
                  {[1, 2, 3].map((itemKey) => (
                    <Skeleton key={itemKey} className="h-12 rounded-xl" />
                  ))}
                </div>
              }
            >
              <KetarunaanPenilaianTab
                tahunPelajaranId={selectedTpId}
                tahunPelajaranNama={academicFilter.selectedTahunPelajaranNama}
                semesterId={selectedSemId}
                semesterNama={academicFilter.selectedSemesterNama}
                kelasId={academicFilter.values.kelasId}
                kelasNama={academicFilter.selectedKelasLabel}
                jurusanId={academicFilter.values.jurusanId}
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

        {visitedTabs.has('struktur_organisasi') && (
          <div className={cn('w-full min-w-0', activeTab === 'struktur_organisasi' ? 'block animate-in fade-in duration-100' : 'hidden')}>
            <KetarunaanKepanitiaanTab
              jadwalKegiatanId={jadwalKegiatanId}
              sesiId={sesiId}
              refetchSesi={refetchSesi}
              guard={guard}
              mode="STRUKTUR"
            />
          </div>
        )}

        {visitedTabs.has('ploting_panitia') && (
          <div className={cn('w-full min-w-0', activeTab === 'ploting_panitia' ? 'block animate-in fade-in duration-100' : 'hidden')}>
            <KetarunaanKepanitiaanTab
              jadwalKegiatanId={jadwalKegiatanId}
              sesiId={sesiId}
              refetchSesi={refetchSesi}
              guard={guard}
              mode="PLOTING"
            />
          </div>
        )}

        {visitedTabs.has('backfill_presensi') && (
          <div className={cn('w-full min-w-0 p-3 sm:p-4 space-y-4', activeTab === 'backfill_presensi' ? 'block animate-in fade-in duration-100' : 'hidden')}>
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Rekap Backfill Absensi ke Belakang (Template Excel Per Rombel)</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                  Unduh template Excel per rombel/peleton dan impor rekap kehadiran Ketarunaan ke belakang. Eksekusi dilindungi oleh Guard Event Resmi Admin.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsBackfillModalOpen(true)}
                className="shrink-0 h-9 px-4 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Buka Wizard Rekap Backfill Excel</span>
              </Button>
            </div>

            <Suspense
              fallback={
                <div className="p-4 space-y-2.5">
                  {[1, 2, 3].map((itemKey) => (
                    <Skeleton key={itemKey} className="h-12 rounded-xl" />
                  ))}
                </div>
              }
            >
              <AttendanceStagingView
                tahunPelajaranId={selectedTpId}
                semesterId={selectedSemId}
                kelasId={academicFilter.values.kelasId}
                hideLayout
                onSyncSuccess={() => {
                  handleRefresh();
                  queryClient.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
                }}
              />
            </Suspense>
          </div>
        )}
      </div>
    </SectionCard>
  );

  // Jika dipanggil sebagai subtab dari KesiswaanDashboard (hideLayout=true), tampilkan navigasi subtab + filter kompak tanpa sidebar ganda
  if (hideLayout) {
    return (
      <InfraErrorBoundary>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
                      isActive
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsBackfillModalOpen(true)}
                className="h-8 px-2.5 text-xs font-bold gap-1.5 border-amber-300 text-amber-800 dark:text-amber-300"
              >
                <Clock size={13} className="text-amber-600" />
                <span>Rekap Backfill</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsStagingModalOpen(true)}
                className="h-8 px-2.5 text-xs font-bold gap-1.5"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span>Staging Presensi</span>
              </Button>
            </div>
          </div>

          <AcademicFilterToolbar {...academicFilter.toolbarProps} variant="compact" />
          {tabPanelsNode}

          {isBackfillModalOpen && (
            <Suspense fallback={null}>
              <HistoricalBackfillModal
                isOpen={isBackfillModalOpen}
                onClose={() => setIsBackfillModalOpen(false)}
                kelasId={
                  academicFilter.values.kelasId ||
                  academicFilter.options.kelasOptions?.[0]?.value ||
                  ''
                }
                kelasNama={
                  academicFilter.selectedKelasLabel ||
                  academicFilter.options.kelasOptions?.[0]?.label ||
                  'Pilih Rombel'
                }
                kelasList={academicFilter.options.kelasOptions}
                jenisKegiatan="KETARUNAAN"
                jadwalKegiatanId={jadwalKegiatanId || undefined}
                tahunPelajaranId={selectedTpId}
                semesterId={selectedSemId}
                onSuccess={() => {
                  handleRefresh();
                  queryClient.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
                }}
              />
            </Suspense>
          )}

          {isStagingModalOpen && (
            <Suspense fallback={null}>
              <AttendanceStagingModal
                isOpen={isStagingModalOpen}
                onClose={() => setIsStagingModalOpen(false)}
                tahunPelajaranId={selectedTpId}
                semesterId={selectedSemId}
                kelasId={academicFilter.values.kelasId}
                onSyncSuccess={() => {
                  handleRefresh();
                  queryClient.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
                }}
              />
            </Suspense>
          )}
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
            { text: 'Buka menu Terminal Absensi saat jam kegiatan berlangsung untuk scan RFID atau presensi pembina.' },
            { text: 'Buka menu Ringkasan untuk melihat monitoring dan tren disiplin kehadiran taruna.' },
            { text: 'Gunakan menu Penilaian, Bagan Struktur Organisasi, dan Tabel Ploting Panitia sesuai kebutuhan.' },
          ],
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls */}
          <aside className="hidden lg:block sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain role-dashboard-sidebar-scroll pr-1.5 space-y-3 pb-12">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-600 to-red-700 text-white shadow-xs space-y-2.5 border border-rose-500/40 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" aria-hidden="true" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30 text-white flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <Medal className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-100/90 block leading-tight drop-shadow-2xs">
                    Korps Pembina
                  </span>
                  <h2 className="text-sm font-black text-white tracking-wider truncate uppercase drop-shadow-2xs">
                    Ketarunaan
                  </h2>
                </div>
              </div>

              <div className="pt-2 border-t border-white/20 space-y-1 text-[11px] text-white/90 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-rose-100/80">Periode Aktif</span>
                  <span className="font-bold text-white text-[10px] bg-white/20 backdrop-blur-xs border border-white/25 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                    {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                  </span>
                </div>
                {guard?.jadwal_waktu_mulai && (
                  <div className="flex items-center gap-1 text-[10px] text-rose-100/90 truncate pt-0.5">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {hariAktifLabel ? `${hariAktifLabel} • ` : ''}
                      {formatWaktu(guard.jadwal_waktu_mulai)}–{formatWaktu(guard.jadwal_waktu_selesai)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <AcademicFilterToolbar
              {...academicFilter.toolbarProps}
              variant="sidebar"
            />

            <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                      isActive
                        ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && tab.badge !== null && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0 ml-1.5',
                          isActive
                            ? 'bg-white/20 text-white'
                            : tab.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
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

          {/* Right Column: Main Content */}
          <main className="min-w-0 flex-1 space-y-3">
            {/* Mobile Subtab Bar Fallback */}
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0',
                      isActive
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {tabPanelsNode}
          </main>
        </div>

        {isBackfillModalOpen && (
          <Suspense fallback={null}>
            <HistoricalBackfillModal
              isOpen={isBackfillModalOpen}
              onClose={() => setIsBackfillModalOpen(false)}
              kelasId={
                academicFilter.values.kelasId ||
                academicFilter.options.kelasOptions?.[0]?.value ||
                ''
              }
              kelasNama={
                academicFilter.selectedKelasLabel ||
                academicFilter.options.kelasOptions?.[0]?.label ||
                'Pilih Rombel'
              }
              kelasList={academicFilter.options.kelasOptions}
              jenisKegiatan="KETARUNAAN"
              jadwalKegiatanId={jadwalKegiatanId || undefined}
              tahunPelajaranId={selectedTpId}
              semesterId={selectedSemId}
              onSuccess={() => {
                handleRefresh();
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
              }}
            />
          </Suspense>
        )}
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
};

export default ProgramKetarunaanPage;
