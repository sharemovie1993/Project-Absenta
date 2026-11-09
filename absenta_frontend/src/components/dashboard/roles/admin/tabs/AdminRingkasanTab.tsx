import React, { useMemo, Suspense, lazy } from 'react';
import { 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  Calendar,
  Settings,
  ShieldCheck,
  Activity,
  Layers,
  BookOpen,
  Building2,
  Key,
  History,
  Award,
  CheckCircle2,
  Printer,
  Clock,
  FileText,
  Archive,
  Network,
  MoveVertical,
  ClipboardList
} from 'lucide-react';
import { 
  HubCard, 
  HubBentoGrid, 
  HubActionGrid, 
  type HubBentoCell, 
  type HubActionItem 
} from '@/components/ui/hub';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { Loader } from '@/components/ui/Loader';
import type { AdminTabId } from '../types';
import type { DashboardOverviewStats, ChartData } from '@/types/dashboard';
import type { AcademicStats } from '@/api/academic-stats.api';

const AttendanceChart = lazy(() => import('@/components/charts/AttendanceChart'));

export interface AdminRingkasanTabProps {
  user?: any;
  stats?: DashboardOverviewStats | null;
  academicStats?: AcademicStats | null;
  chartData?: ChartData | null;
  loading?: boolean;
  tpTahun?: string;
  semNama?: string;
  onNavigateSubtab?: (subtab: AdminTabId) => void;
}

export const AdminRingkasanTab: React.FC<AdminRingkasanTabProps> = React.memo(({
  stats,
  academicStats,
  chartData,
  loading = false,
  tpTahun = '',
  semNama = '',
  onNavigateSubtab,
}) => {
  const totalSiswa = stats?.total_siswa ?? academicStats?.total_siswa ?? 0;
  const totalGuru = stats?.total_guru ?? academicStats?.total_guru ?? 0;
  const persentaseSiswa = stats?.persentase_siswa ?? 0;
  const persentaseGuru = stats?.persentase_guru ?? 0;
  const siswaHadir = stats?.siswa_hadir ?? 0;
  const guruHadir = stats?.guru_hadir ?? 0;

  // 1. Bento Grid 2x2 Metrik Utama (Shopee-Grade Hairline Dividers)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'siswa',
        title: 'Total Siswa Aktif',
        value: totalSiswa > 0 ? `${totalSiswa.toLocaleString('id-ID')} Siswa` : (loading ? 'Memuat...' : '0 Siswa'),
        subtext: 'Basis Data Siswa Terdaftar',
        icon: Users,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => onNavigateSubtab?.('siswa'),
      },
      {
        id: 'guru',
        title: 'Guru & Tenaga Kependidikan',
        value: totalGuru > 0 ? `${totalGuru.toLocaleString('id-ID')} PTK` : (loading ? 'Memuat...' : '0 PTK'),
        subtext: 'Direktori GTK Sekolah',
        icon: GraduationCap,
        iconColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
        onClick: () => onNavigateSubtab?.('guru'),
      },
      {
        id: 'kehadiran_siswa',
        title: 'Kehadiran Siswa Hari Ini',
        value: `${persentaseSiswa.toFixed(1)}%`,
        subtext: `${siswaHadir} dari ${totalSiswa} Siswa Hadir`,
        icon: CalendarCheck,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onNavigateSubtab?.('kelas'),
      },
      {
        id: 'kehadiran_guru',
        title: 'Kehadiran Guru Mengajar',
        value: `${persentaseGuru.toFixed(1)}%`,
        subtext: `${guruHadir} Guru Mengajar di Kelas`,
        icon: CheckCircle2,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        onClick: () => onNavigateSubtab?.('guru'),
      },
    ],
    [totalSiswa, totalGuru, persentaseSiswa, persentaseGuru, siswaHadir, guruHadir, loading, onNavigateSubtab]
  );

  // 2. Pintasan Operasional Admin Berstandar Shopee-Grade Headerless Slider
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'siswa',
        label: 'Data Siswa',
        icon: Users,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onNavigateSubtab?.('siswa'),
      },
      {
        id: 'guru',
        label: 'Guru & Staf',
        icon: GraduationCap,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        onClick: () => onNavigateSubtab?.('guru'),
      },
      {
        id: 'kelas',
        label: 'Daftar Kelas',
        icon: Layers,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onNavigateSubtab?.('kelas'),
      },
      {
        id: 'jurusan',
        label: 'Jurusan',
        icon: Building2,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        onClick: () => onNavigateSubtab?.('jurusan'),
      },
      {
        id: 'mapel',
        label: 'Mata Pelajaran',
        icon: BookOpen,
        iconColorClass: 'text-teal-600 dark:text-teal-400',
        onClick: () => onNavigateSubtab?.('mapel'),
      },
      {
        id: 'tahun_pelajaran',
        label: 'Tahun Ajaran',
        icon: Calendar,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onNavigateSubtab?.('tahun_pelajaran'),
      },
      {
        id: 'semester',
        label: 'Semester',
        icon: Clock,
        iconColorClass: 'text-sky-600 dark:text-sky-400',
        onClick: () => onNavigateSubtab?.('semester'),
      },
      {
        id: 'dokumen',
        label: 'Dokumen',
        icon: FileText,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onNavigateSubtab?.('dokumen'),
      },
      {
        id: 'berkas_ptk',
        label: 'Berkas PTK',
        icon: Archive,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onNavigateSubtab?.('berkas_ptk'),
      },
      {
        id: 'jenis_kegiatan',
        label: 'Jenis Kegiatan',
        icon: Activity,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => onNavigateSubtab?.('jenis_kegiatan'),
      },
      {
        id: 'struktur_organisasi',
        label: 'Struktur Organisasi',
        icon: Network,
        iconColorClass: 'text-cyan-600 dark:text-cyan-400',
        onClick: () => onNavigateSubtab?.('struktur_organisasi'),
      },
      {
        id: 'kenaikan_kelas',
        label: 'Kenaikan Kelas',
        icon: MoveVertical,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onNavigateSubtab?.('kenaikan_kelas'),
      },
      {
        id: 'cetak_berkas',
        label: 'Cetak Berkas',
        icon: ClipboardList,
        iconColorClass: 'text-violet-600 dark:text-violet-400',
        onClick: () => onNavigateSubtab?.('cetak_berkas'),
      },
      {
        id: 'users',
        label: 'Akun Pengguna',
        icon: Key,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => onNavigateSubtab?.('users'),
      },
      {
        id: 'roles',
        label: 'Peran & Akses',
        icon: Award,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        onClick: () => onNavigateSubtab?.('roles'),
      },
      {
        id: 'audit',
        label: 'Log Aktivitas',
        icon: History,
        iconColorClass: 'text-slate-600 dark:text-slate-400',
        onClick: () => onNavigateSubtab?.('audit'),
      },
      {
        id: 'sekolah',
        label: 'Kop Surat',
        icon: Printer,
        iconColorClass: 'text-orange-600 dark:text-orange-400',
        onClick: () => onNavigateSubtab?.('sekolah'),
      },
      {
        id: 'pengaturan',
        label: 'Pengaturan',
        icon: Settings,
        iconColorClass: 'text-slate-700 dark:text-slate-300',
        onClick: () => onNavigateSubtab?.('pengaturan'),
      },
    ],
    [onNavigateSubtab]
  );

  return (
    <div className="space-y-4">
      {/* ── 1. Workspace App Launcher Portal ── */}
      <WorkspaceAppLauncherCard workspaceId="ADMIN_WORKSPACE" />

      {/* ── 2. Bento Grid 4 Sel Garis Rambut (Standar Shopee UI) ── */}
      <HubBentoGrid cells={bentoCells} columns={4} />

      {/* ── 3. Quick Action Slider 1-Baris Headerless (Shopee UI Paradigm) ── */}
      <HubCard bodyClassName="py-2.5 px-2">
        <HubActionGrid items={actionItems} variant="slider" />
      </HubCard>

      {/* ── 4. Tren Kehadiran Bulanan (Attendance Chart) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Tren Kehadiran Bulanan Siswa &amp; Guru</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Statistik fluktuasi kehadiran harian selama semester aktif ({semNama ? `${semNama} ` : ''}{tpTahun})
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>

        <div className="min-h-[280px]">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64 text-slate-400">
                <Loader size="sm" />
              </div>
            }
          >
            <AttendanceChart data={chartData || null} height={280} />
          </Suspense>
        </div>
      </div>
    </div>
  );
});

AdminRingkasanTab.displayName = 'AdminRingkasanTab';
