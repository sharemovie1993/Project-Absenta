import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Medal,
  Users,
  BarChart2,
  FileText,
  LayoutList,
  Lock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui/SectionCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { useCapabilities } from '../../hooks/useCapabilities';
import {
  getKetarunaanGuardStatus,
  getKetarunaanStats,
  getKetarunaanSesiHariIni,
} from '../../api/kesiswaan/programKetarunaan.api';

// Subkomponen Modular
import { KetarunaanKepanitiaanTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanKepanitiaanTab';
import { KetarunaanStatistikTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanStatistikTab';
import { KetarunaanLaporanTimTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanLaporanTimTab';
import { KetarunaanLaporanKelasTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanLaporanKelasTab';

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

// ─── GUARD STATE ───────────────────────────────────────────────────────────────

const GuardState: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => {
  const handleNavAgenda = useCallback(() => {
    navigate('/kesiswaan/jadwal-kegiatan');
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mb-5 shadow-sm">
        <Lock className="w-10 h-10 text-amber-500" />
      </div>
      <div className="space-y-2 max-w-md mb-6">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
          Program Ketarunaan Belum Aktif
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Jadwal Kegiatan Ketarunaan belum dikonfigurasi atau belum diaktifkan.
          Aktifkan terlebih dahulu di menu <strong>Agenda Kesiswaan</strong> untuk membuka terminal presensi dan pemantauan.
        </p>
      </div>
      <Button
        variant="default"
        onClick={handleNavAgenda}
        className="gap-2 shadow-sm font-bold"
      >
        <ExternalLink className="w-4 h-4" />
        Buka Agenda Kesiswaan
      </Button>
    </div>
  );
};

// ─── TAB CONFIG ────────────────────────────────────────────────────────────────

const TAB_OPTIONS = [
  { id: 'statistik',   label: 'Performa Perkembangan', icon: BarChart2 },
  { id: 'laporan_kelas', label: 'Laporan Per Rombel',   icon: LayoutList },
  { id: 'laporan_tim', label: 'Laporan Pendamping',    icon: FileText },
  { id: 'kepanitiaan', label: 'Terminal Presensi & POS', icon: Users },
];

// ─── PAGE COMPONENT ────────────────────────────────────────────────────────────

export interface ProgramKetarunaanPageProps {
  hideLayout?: boolean;
}

const ProgramKetarunaanPage: React.FC<ProgramKetarunaanPageProps> = ({ hideLayout = false }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('statistik');
  const { isKesiswaan, isAdmin, can } = useCapabilities();

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
    queryKey: ['ketarunaan-stats', jadwalKegiatanId],
    queryFn: () => getKetarunaanStats({
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
      limit: 10,
    }),
    enabled: Boolean(guard?.is_active),
    staleTime: 60_000,
  });

  const sesiId = sesiData?.data?.id ?? null;
  const stats = statsData?.data;

  // Memoized handlers mencegah DOM churn
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
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

  const tabOptionsMemo = useMemo(() => TAB_OPTIONS, []);

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
    <div className="space-y-6">
      {/* Status strip info: Ringkas & Bersih */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Medal className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                  {guard?.jadwal_nama || 'Program Ketarunaan'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {hariAktifLabel ? `${hariAktifLabel} ` : ''}{formatWaktu(guard?.jadwal_waktu_mulai)} – {formatWaktu(guard?.jadwal_waktu_selesai)} WIB
                </span>
                {!guard?.is_active ? (
                  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                    Agenda Nonaktif
                  </Badge>
                ) : guard?.is_today_scheduled_day && guard?.is_within_time_window ? (
                  <Badge variant="success" className="text-[10px]">
                    Sesi Berlangsung
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
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="gap-1.5 text-xs text-slate-500 hover:text-slate-800 self-end sm:self-center"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan
            </Button>
          </div>

          {/* Container Tab Utama serasi SiswaPage */}
          <SectionCard fullWidth noPadding className="overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="px-4 sm:px-6 pt-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="overflow-x-auto no-scrollbar">
                <TabSwitcher
                  options={tabOptionsMemo}
                  activeTab={activeTab}
                  onChange={handleTabChange}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900">
              <Suspense
                fallback={
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4]?.map((itemKey) => (
                      <Skeleton key={itemKey} className="h-12 rounded-2xl" />
                    ))}
                  </div>
                }
              >
                {activeTab === 'kepanitiaan' && (
                  !guard?.is_active ? (
                    <GuardState navigate={navigate} />
                  ) : (
                    <KetarunaanKepanitiaanTab
                      jadwalKegiatanId={jadwalKegiatanId}
                      sesiId={sesiId}
                      refetchSesi={refetchSesi}
                      guard={guard}
                    />
                  )
                )}
                {activeTab === 'statistik' && (
                  <KetarunaanStatistikTab
                    jadwalKegiatanId={jadwalKegiatanId}
                  />
                )}
                {activeTab === 'laporan_tim' && (
                  <KetarunaanLaporanTimTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                  />
                )}
                {activeTab === 'laporan_kelas' && (
                  <KetarunaanLaporanKelasTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                  />
                )}
              </Suspense>
            </div>
          </SectionCard>
        </div>
  );

  if (hideLayout) {
    return <InfraErrorBoundary>{mainContent}</InfraErrorBoundary>;
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
