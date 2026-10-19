import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BarChart2,
  FileText,
  LayoutList,
  Lock,
  ExternalLink,
  RefreshCw,
  Moon,
  HeartHandshake
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
  getDhuhaGuardStatus,
  getDhuhaStats,
  getDhuhaSesiHariIni,
} from '../../api/kesiswaan/pembiasaanDhuha.api';

// Subkomponen Modular Pembiasaan Dhuha
import { DhuhaKepanitiaanTab } from '../../components/kesiswaan/pembiasaan-dhuha/DhuhaKepanitiaanTab';
import { DhuhaStatistikTab } from '../../components/kesiswaan/pembiasaan-dhuha/DhuhaStatistikTab';
import { DhuhaLaporanTimTab } from '../../components/kesiswaan/pembiasaan-dhuha/DhuhaLaporanTimTab';
import { DhuhaLaporanKelasTab } from '../../components/kesiswaan/pembiasaan-dhuha/DhuhaLaporanKelasTab';

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
      <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-5 shadow-sm">
        <Lock className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-2 max-w-md mb-6">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
          Pembiasaan Dhuha Belum Aktif
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Jadwal Pembiasaan Dhuha belum dikonfigurasi atau belum diaktifkan.
          Aktifkan terlebih dahulu di menu <strong>Agenda Kesiswaan</strong> untuk membuka terminal presensi dan pemantauan.
        </p>
      </div>
      <Button
        variant="default"
        onClick={handleNavAgenda}
        className="gap-2 shadow-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <ExternalLink className="w-4 h-4" />
        Buka Agenda Kesiswaan
      </Button>
    </div>
  );
};

// ─── TAB CONFIG ────────────────────────────────────────────────────────────────

const TAB_OPTIONS = [
  { id: 'kepanitiaan', label: 'Kepanitiaan & Terminal', icon: Users },
  { id: 'statistik',   label: 'Progres & Statistik',    icon: BarChart2 },
  { id: 'laporan_tim', label: 'Laporan Pendamping',      icon: FileText },
  { id: 'laporan_kelas', label: 'Laporan Per Kelas',     icon: LayoutList },
];

// ─── PAGE COMPONENT ────────────────────────────────────────────────────────────

const PembiasaanDhuhaPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kepanitiaan');
  const { isKesiswaan, isAdmin, can } = useCapabilities();

  // Guard check
  const {
    data: guard,
    isLoading: isGuardLoading,
    refetch: refetchGuard,
  } = useQuery({
    queryKey: ['dhuha-guard'],
    queryFn: getDhuhaGuardStatus,
    staleTime: 60_000,
  });

  const jadwalKegiatanId = guard?.jadwal_kegiatan_id ?? null;

  // Sesi hari ini
  const {
    data: sesiData,
    isLoading: isSesiLoading,
    refetch: refetchSesi,
  } = useQuery({
    queryKey: ['dhuha-sesi-hari-ini', jadwalKegiatanId],
    queryFn: () => getDhuhaSesiHariIni({
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
    queryKey: ['dhuha-stats', jadwalKegiatanId],
    queryFn: () => getDhuhaStats({
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
      limit: 10,
    }),
    enabled: Boolean(guard?.is_active),
    staleTime: 60_000,
  });

  const sesiId = sesiData?.data?.id ?? null;
  const stats = statsData?.data;

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchGuard();
    refetchSesi();
  }, [refetchGuard, refetchSesi]);

  const hariAktifLabel = useMemo(() => {
    if (!guard?.hari_aktif?.length) return '';
    return (guard?.hari_aktif ?? [])?.map(h => HARI_LABEL[h] || h).join(', ');
  }, [guard?.hari_aktif]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Kesiswaan', path: '/kesiswaan' },
    { label: 'Pembiasaan Dhuha', path: '/kesiswaan/program-dhuha' },
  ], []);

  const tabOptionsMemo = useMemo(() => TAB_OPTIONS, []);

  const statCards = useMemo(() => {
    const summaryTerkini = stats?.latest;
    const hasPastSession = Boolean(stats?.trend && stats.trend.length > 0);

    return [
      {
        title: 'Jamaah Siswa',
        value: hasPastSession && summaryTerkini?.persen_hadir_siswa !== undefined
          ? `${summaryTerkini.persen_hadir_siswa}%`
          : (guard?.is_active ? 'Siaga' : '—'),
        icon: <Users size={14} />,
        gradient: 'from-emerald-500 to-teal-600',
        subtitle: hasPastSession && summaryTerkini
          ? `${summaryTerkini.hadir_siswa} dari ${summaryTerkini.total_siswa} jamaah hadir`
          : `${stats?.total_siswa_master ? `${stats.total_siswa_master} Siswa` : '1.200+ Siswa'} Terdaftar`,
      },
      {
        title: 'Tim Pendamping',
        value: hasPastSession && summaryTerkini && summaryTerkini.total_pendamping > 0
          ? `${summaryTerkini.hadir_pendamping}/${summaryTerkini.total_pendamping}`
          : (guard?.is_active ? '76 Siap' : '—'),
        icon: <HeartHandshake size={14} />,
        gradient: 'from-teal-600 to-cyan-600',
        subtitle: hasPastSession && summaryTerkini && summaryTerkini.total_pendamping > 0
          ? `${summaryTerkini.persen_hadir_pendamping}% kehadiran guru & pembina`
          : 'Pembina Rohis & Wali Kelas Terdaftar',
      },
      {
        title: 'Status Program',
        value: guard?.is_active ? 'Aktif' : 'Nonaktif',
        icon: <Moon size={14} />,
        gradient: guard?.is_active ? 'from-emerald-500 to-green-600' : 'from-slate-400 to-slate-600',
        subtitle: guard?.jadwal_nama || 'Agenda pembiasaan dhuha',
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

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pembiasaan Dhuha"
        description="Pusat pengelolaan presensi jamaah, pemantauan pembina rohis, terminal RFID, dan laporan pembiasaan Sholat Dhuha."
        breadcrumbs={breadcrumbs}
        stats={statCards}
        isLoadingStats={isGuardLoading || isStatsLoading || isSesiLoading}
        hardeningModuleKey="pembiasaan_dhuha"
        canView={canView}
        permissionMessage="Anda tidak memiliki izin untuk mengakses modul Pembiasaan Dhuha."
        instruction={{
          title: 'Panduan Operasional Pembiasaan Dhuha',
          description: (
            <div className="space-y-2 text-sm">
              <p>
                Modul ini mengelola seluruh kegiatan <strong>Pembiasaan Dhuha Bersama</strong> di sekolah, mencakup kehadiran pembina rohis, monitoring jamaah per rombel, dan cetak arsip berkas fisik.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500 dark:text-slate-400">
                <p><strong>Fungsi:</strong> Presensi terintegrasi jam KBM dan rekap komprehensif pendamping serta jamaah siswa.</p>
                <p><strong>Waktu Penggunaan:</strong> Sebelum dan selama sesi Pembiasaan Dhuha berlangsung di masjid / lapangan sekolah.</p>
              </div>
            </div>
          ),
          items: [
            { text: 'Tap tombol Hadir/Izin pada tab Kepanitiaan atau gunakan Mode Scan RFID (POS) untuk tap kartu guru.' },
            { text: 'Guru yang jadwal mengajarnya beririsan dengan sesi Dhuha otomatis tercatat hadir dan KBM-nya dibuka.' },
            { text: 'Gunakan tab Laporan Pendamping & Laporan Per Kelas untuk mencetak arsip fisik siap tanda tangan.' },
          ],
        }}
      >
        <div className="space-y-6">
          {/* Strip info jadwal aktif / standby */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-2xl p-4 shadow-sm ${
            !guard?.is_active
              ? 'bg-gradient-to-r from-slate-50 to-amber-50 dark:from-slate-900/60 dark:to-amber-950/20 border-amber-200/80 dark:border-amber-800/60'
              : guard?.is_today_scheduled_day && guard?.is_within_time_window
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200/80 dark:border-emerald-800/60'
                : 'bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-900/40 dark:to-blue-950/20 border-slate-200/80 dark:border-slate-800/60'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                !guard?.is_active
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : guard?.is_today_scheduled_day && guard?.is_within_time_window
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
              }`}>
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {guard?.jadwal_nama || 'Pembiasaan Dhuha'}
                  </h3>
                  {!guard?.is_active ? (
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40">
                      Agenda Nonaktif
                    </Badge>
                  ) : guard?.is_today_scheduled_day && guard?.is_within_time_window ? (
                    <Badge variant="success" className="text-[10px] font-bold">
                      Sesi Aktif Berlangsung
                    </Badge>
                  ) : guard?.is_today_scheduled_day ? (
                    <Badge variant="info" className="text-[10px] font-bold">
                      Hari Pelaksanaan (Standby)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold border-slate-300 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                      Mode Siaga (Di Luar Hari Jadwal)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {hariAktifLabel && `${hariAktifLabel} • `}
                  {formatWaktu(guard?.jadwal_waktu_mulai)} – {formatWaktu(guard?.jadwal_waktu_selesai)} WIB
                  {sesiId ? (
                    <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400">
                      ● Sesi Hari Ini Berjalan
                    </span>
                  ) : !guard?.is_today_scheduled_day ? (
                    <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                      (Hari ini {guard?.today_hari ? HARI_LABEL[guard.today_hari] || guard.today_hari : ''} bukan hari kegiatan)
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="gap-1.5 text-xs bg-white/80 dark:bg-slate-900/80"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Segarkan
              </Button>
            </div>
          </div>

          {/* Container Tab Utama — Selalu Terbuka untuk Akses Laporan & Statistik */}
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
                    <DhuhaKepanitiaanTab
                      jadwalKegiatanId={jadwalKegiatanId}
                      sesiId={sesiId}
                      refetchSesi={refetchSesi}
                      guard={guard}
                    />
                  )
                )}
                {activeTab === 'statistik' && (
                  <DhuhaStatistikTab
                    jadwalKegiatanId={jadwalKegiatanId}
                  />
                )}
                {activeTab === 'laporan_tim' && (
                  <DhuhaLaporanTimTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                  />
                )}
                {activeTab === 'laporan_kelas' && (
                  <DhuhaLaporanKelasTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                  />
                )}
              </Suspense>
            </div>
          </SectionCard>
        </div>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
};

export default PembiasaanDhuhaPage;
