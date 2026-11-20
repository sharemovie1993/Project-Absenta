import React, { useState, useMemo, useCallback, Suspense } from 'react';
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

// Subkomponen Modular
import { KetarunaanKepanitiaanTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanKepanitiaanTab';
import { KetarunaanStatistikTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanStatistikTab';
import { KetarunaanLaporanTimTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanLaporanTimTab';
import { KetarunaanLaporanKelasTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanLaporanKelasTab';
import { KetarunaanPenilaianTab } from '../../components/kesiswaan/program-ketarunaan/KetarunaanPenilaianTab';
import {
  KetarunaanWorkdeskFlightDeck,
  KetarunaanWorkflowStepId,
} from '../../components/kesiswaan/program-ketarunaan/KetarunaanWorkdeskFlightDeck';

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

// ─── PAGE COMPONENT ────────────────────────────────────────────────────────────

export interface ProgramKetarunaanPageProps {
  hideLayout?: boolean;
}

const ProgramKetarunaanPage: React.FC<ProgramKetarunaanPageProps> = ({ hideLayout = false }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('penilaian');
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
    <div className="space-y-4">
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

      {/* ── Area Kerja Aktif Sesuai Tahap Terpilih ── */}
      <SectionCard fullWidth noPadding className="overflow-hidden border border-slate-100 dark:border-slate-800">
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
            {activeTab === 'penilaian' && (
              <KetarunaanPenilaianTab
                tahunPelajaranId={selectedTpId}
                tahunPelajaranNama={academicFilter.selectedTahunPelajaranNama}
                semesterId={selectedSemId}
                semesterNama={academicFilter.selectedSemesterNama}
                kelasId={academicFilter.values.kelasId}
                kelasNama={academicFilter.selectedKelasLabel}
                jurusanId={academicFilter.values.jurusanId}
              />
            )}
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
                tahunPelajaranId={selectedTpId}
                semesterId={selectedSemId}
              />
            )}
            {activeTab === 'laporan_tim' && (
              <KetarunaanLaporanTimTab
                jadwalKegiatanId={jadwalKegiatanId}
                sesiId={sesiId}
                tahunPelajaranId={selectedTpId}
                semesterId={selectedSemId}
              />
            )}
            {activeTab === 'laporan_kelas' && (
              <KetarunaanLaporanKelasTab
                jadwalKegiatanId={jadwalKegiatanId}
                sesiId={sesiId}
                tahunPelajaranId={selectedTpId}
                semesterId={selectedSemId}
              />
            )}
          </Suspense>
        </div>
      </SectionCard>
    </div>
  );

  if (hideLayout) {
    return (
      <InfraErrorBoundary>
        <div className="space-y-4">
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
