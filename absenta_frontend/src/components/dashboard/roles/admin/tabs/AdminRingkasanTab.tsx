import React, { useMemo, useState, Suspense, lazy } from 'react';
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
  ClipboardList,
  AlertTriangle,
  AlertCircle,
  BarChart2,
  PlusCircle,
  ArrowRight,
  Database,
} from 'lucide-react';
import { 
  HubCard, 
  HubBentoGrid, 
  HubActionGrid, 
  HubListRow, 
  HubStatusStrip,
  type HubBentoCell, 
  type HubActionItem,
  type HubStatusItem 
} from '@/components/ui/hub';
import { Loader } from '@/components/ui/Loader';
import type { AdminTabId } from '../types';
import type { DashboardOverviewStats, ChartData } from '@/types/dashboard';
import type { AcademicStats } from '@/api/academic-stats.api';
import type { ActivityLogItem } from '@/api/activityLog.api';
import { cn } from '@/lib/utils';

const AttendanceChart = lazy(() => import('@/components/charts/AttendanceChart'));

export interface AdminRingkasanTabProps {
  user?: any;
  stats?: DashboardOverviewStats | null;
  academicStats?: AcademicStats | null;
  chartData?: ChartData | null;
  recentLogs?: ActivityLogItem[];
  isLogsLoading?: boolean;
  loading?: boolean;
  tpTahun?: string;
  semNama?: string;
  onNavigateSubtab?: (subtab: AdminTabId) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    if (diffSec < 172800) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  } catch {
    return dateString;
  }
}

function getLogMeta(action: string) {
  const act = (action || '').toUpperCase();
  if (act.includes('CREATE') || act.includes('ADD') || act.includes('INSERT')) {
    return {
      icon: PlusCircle,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
    };
  }
  if (act.includes('DELETE') || act.includes('REMOVE') || act.includes('DROP')) {
    return {
      icon: AlertCircle,
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
    };
  }
  if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('PATCH')) {
    return {
      icon: Activity,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
    };
  }
  if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('PASSWORD')) {
    return {
      icon: Key,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
    };
  }
  return {
    icon: History,
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
}

export const AdminRingkasanTab: React.FC<AdminRingkasanTabProps> = React.memo(({
  stats,
  academicStats,
  chartData,
  recentLogs = [],
  isLogsLoading = false,
  loading = false,
  tpTahun = '',
  semNama = '',
  onNavigateSubtab,
}) => {
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'chart' | 'tingkat'>('chart');
  const [isChartReady, setIsChartReady] = useState(false);

  React.useEffect(() => {
    const idleCallback = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 250));
    const handle = idleCallback(() => setIsChartReady(true));
    return () => {
      if ((window as any).cancelIdleCallback && typeof handle === 'number') {
        (window as any).cancelIdleCallback(handle);
      }
    };
  }, []);

  const totalSiswa = stats?.total_siswa ?? academicStats?.total_siswa ?? 0;
  const totalGuru = stats?.total_guru ?? academicStats?.total_guru ?? 0;
  const persentaseSiswa = stats?.persentase_siswa ?? 0;
  const persentaseGuru = stats?.persentase_guru ?? 0;
  const siswaHadir = stats?.siswa_hadir ?? 0;
  const guruHadir = stats?.guru_hadir ?? 0;

  // ── BLOK 1: Strip Status Sistem & Jadwal Aktif (Shopee Balance Strip) ──
  const statusStripItems: HubStatusItem[] = useMemo(
    () => [
      {
        id: 'tp',
        icon: <Calendar size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />,
        title: tpTahun ? `TP ${tpTahun}` : 'Tahun Ajaran',
        subtitle: semNama ? `Semester ${semNama}` : 'Belum Ditentukan',
        badge: (
          <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
            Aktif
          </span>
        ),
        onClick: () => onNavigateSubtab?.('tahun_pelajaran'),
      },
      {
        id: 'sesi',
        icon: (
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        ),
        title: `${stats?.total_sesi_aktif ?? 0} Sesi KBM`,
        subtitle: 'Presensi Real-time',
        onClick: () => onNavigateSubtab?.('aturan_absensi'),
      },
      {
        id: 'rombel',
        icon: <Layers size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />,
        title: `${academicStats?.total_kelas ?? 0} Rombel`,
        subtitle: `${academicStats?.total_jurusan ?? 0} Jurusan`,
        onClick: () => onNavigateSubtab?.('kelas'),
      },
      {
        id: 'audit',
        icon: <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />,
        title: 'Integritas Sistem',
        subtitle: 'Audit & Proteksi',
        onClick: () => onNavigateSubtab?.('audit'),
      },
    ],
    [tpTahun, semNama, stats?.total_sesi_aktif, academicStats?.total_kelas, academicStats?.total_jurusan, onNavigateSubtab]
  );

  // ── BLOK 2: Bento Grid 4 Sel Garis Rambut (Standar Shopee UI) ──
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'siswa',
        title: 'Total Siswa Aktif',
        value: totalSiswa > 0 ? `${totalSiswa.toLocaleString('id-ID')} Siswa` : (loading ? 'Memuat...' : '0 Siswa'),
        subtext: `${academicStats?.total_kelas || 0} Rombel • ${academicStats?.total_jurusan || 0} Keahlian`,
        icon: Users,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => onNavigateSubtab?.('siswa'),
      },
      {
        id: 'guru',
        title: 'Guru & Tenaga Kependidikan',
        value: totalGuru > 0 ? `${totalGuru.toLocaleString('id-ID')} PTK` : (loading ? 'Memuat...' : '0 PTK'),
        subtext: 'Pendidik & Staf Tata Usaha',
        icon: GraduationCap,
        iconColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
        onClick: () => onNavigateSubtab?.('guru'),
      },
      {
        id: 'kehadiran_siswa',
        title: 'Kehadiran Siswa Hari Ini',
        value: `${persentaseSiswa.toFixed(1)}%`,
        subtext: `${siswaHadir} Hadir${stats?.siswa_sakit ? ` • ${stats.siswa_sakit} S` : ''}${stats?.siswa_izin ? ` • ${stats.siswa_izin} I` : ''}${stats?.siswa_alpa ? ` • ${stats.siswa_alpa} A` : ''}`,
        icon: CalendarCheck,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onNavigateSubtab?.('kelas'),
      },
      {
        id: 'kehadiran_guru',
        title: 'Kehadiran Guru Mengajar',
        value: `${persentaseGuru.toFixed(1)}%`,
        subtext: `${guruHadir} Hadir${stats?.guru_tidak_hadir ? ` • ${stats.guru_tidak_hadir} Absen/Inval` : ' Mengajar'}`,
        icon: CheckCircle2,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        onClick: () => onNavigateSubtab?.('guru'),
      },
    ],
    [totalSiswa, totalGuru, persentaseSiswa, persentaseGuru, siswaHadir, guruHadir, stats?.siswa_sakit, stats?.siswa_izin, stats?.siswa_alpa, stats?.guru_tidak_hadir, academicStats?.total_kelas, academicStats?.total_jurusan, loading, onNavigateSubtab]
  );

  // ── BLOK 4: Pintasan Operasional Admin Berstandar Shopee-Grade Headerless Slider ──
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
        id: 'dapodik',
        label: 'Integrasi Dapodik',
        icon: Database,
        iconColorClass: 'text-cyan-600 dark:text-cyan-400',
        onClick: () => onNavigateSubtab?.('dapodik'),
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

  // Komputasi Kelas per Tingkat (untuk Visualisasi Distribusi Rombel)
  const kelasByTingkat = academicStats?.active_kelas_by_tingkat || [];
  const totalRombel = academicStats?.total_kelas || (kelasByTingkat.reduce((acc, k) => acc + (k.count || 0), 0) || 1);

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* ── 1. BLOK 1: System Health Strip (Status Singkat Periode & Sesi) ── */}
      <HubStatusStrip items={statusStripItems} />

      {/* ── 2. BLOK 2: Bento Grid 4 Sel Garis Rambut (Standar Shopee UI) ── */}
      <HubBentoGrid cells={bentoCells} columns={4} />

      {/* ── 3. BLOK 3: Radar Anomali & Tindakan Segera (Actionable Alerts Hub) ── */}
      <HubCard 
        title="Pusat Diagnostik &amp; Tindakan Segera" 
        subtitle="(Health Check Otomatis)"
        noPadding={true}
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {/* Diagnostic Item 1: Periode Akademik */}
          {!tpTahun || !semNama ? (
            <HubListRow
              icon={AlertCircle}
              iconColorClass="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
              title="Tahun Pelajaran &amp; Semester Belum Aktif"
              subtitle="Aktifkan kalender dan semester agar jadwal presensi &amp; KBM sinkron"
              rightBadge={
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                  Atur TP
                </span>
              }
              onClick={() => onNavigateSubtab?.('tahun_pelajaran')}
            />
          ) : (
            <HubListRow
              icon={CheckCircle2}
              iconColorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              title="Periode Akademik Aktif &amp; Terkunci"
              subtitle={`TP ${tpTahun} • Semester ${semNama} terdaftar sebagai acuan operasional resmi`}
              rightBadge={
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Normal
                </span>
              }
              onClick={() => onNavigateSubtab?.('tahun_pelajaran')}
            />
          )}

          {/* Diagnostic Item 2: Struktur Rombel */}
          {(academicStats?.total_kelas || 0) === 0 ? (
            <HubListRow
              icon={AlertTriangle}
              iconColorClass="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
              title="Belum Ada Rombongan Belajar Dibuat"
              subtitle="Tambahkan kelas agar siswa dapat di-plotting dan jadwal KBM dapat dibentuk"
              rightBadge={
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                  Buat Kelas
                </span>
              }
              onClick={() => onNavigateSubtab?.('kelas')}
            />
          ) : (
            <HubListRow
              icon={Layers}
              iconColorClass="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
              title="Struktur Rombongan Belajar Siap"
              subtitle={`${academicStats?.total_kelas || 0} Rombel terdaftar di ${academicStats?.total_jurusan || 0} kompetensi keahlian`}
              rightBadge={
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                  Lengkap
                </span>
              }
              onClick={() => onNavigateSubtab?.('kelas')}
            />
          )}

          {/* Diagnostic Item 3: Kedisiplinan & Presensi Siswa */}
          {(stats?.siswa_alpa || 0) > 0 ? (
            <HubListRow
              icon={AlertCircle}
              iconColorClass="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
              title={`${stats?.siswa_alpa} Siswa Terdata Alpa Hari Ini`}
              subtitle="Periksa konfirmasi kehadiran atau tindak lanjut pemanggilan wali kelas"
              rightBadge={
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                  Tinjau Siswa
                </span>
              }
              onClick={() => onNavigateSubtab?.('siswa')}
            />
          ) : (
            <HubListRow
              icon={CalendarCheck}
              iconColorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              title="Tingkat Kehadiran Siswa Hari Ini Stabil"
              subtitle={`${siswaHadir} siswa tercatat hadir di lingkungan sekolah hari ini`}
              rightBadge={
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Stabil
                </span>
              }
              onClick={() => onNavigateSubtab?.('siswa')}
            />
          )}

          {/* Diagnostic Item 4: Keamanan Akun & Peran */}
          <HubListRow
            icon={Key}
            iconColorClass="bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
            title="Keamanan Akun, Peran, &amp; Hak Akses"
            subtitle="Pengawasan akun PTK &amp; siswa, reset kata sandi, dan proteksi login ganda"
            rightBadge={
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                Kelola Akses
              </span>
            }
            onClick={() => onNavigateSubtab?.('users')}
          />
        </div>
      </HubCard>

      {/* ── 4. BLOK 4: Pintasan Operasional Slider 1-Baris Headerless ── */}
      <HubCard bodyClassName="py-2.5 px-2">
        <HubActionGrid items={actionItems} variant="slider" />
      </HubCard>

      {/* ── 5. BLOK 5: Tren Analitik & Komposisi Rombel (Dual View) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Analitik Presensi &amp; Distribusi Akademik</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Statistik fluktuasi harian dan persebaran rombongan belajar ({semNama ? `${semNama} ` : ''}{tpTahun})
            </p>
          </div>

          {/* Toggle Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveAnalyticsTab('chart')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeAnalyticsTab === 'chart'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Tren Kehadiran
            </button>
            <button
              type="button"
              onClick={() => setActiveAnalyticsTab('tingkat')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeAnalyticsTab === 'tingkat'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Distribusi Rombel
            </button>
          </div>
        </div>

        {activeAnalyticsTab === 'chart' ? (
          <div className="min-h-[280px]">
            {isChartReady ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64 text-slate-400">
                    <Loader size="sm" />
                  </div>
                }
              >
                <AttendanceChart data={chartData || null} height={280} />
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <Loader size="sm" />
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[280px] flex flex-col justify-center space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {kelasByTingkat.length > 0 ? (
                kelasByTingkat.map((tingkat) => {
                  const percent = Math.round(((tingkat.count || 0) / totalRombel) * 100);
                  return (
                    <div
                      key={tingkat.tingkat}
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Tingkat {tingkat.tingkat}
                        </span>
                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                          {tingkat.count} Rombel
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block mt-1.5">
                        {percent}% dari total rombel
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="sm:col-span-3 text-center py-10 text-xs text-slate-400">
                  Data distribusi tingkat belum tersedia
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs flex items-center justify-between">
              <span className="font-medium">
                Total Rombel Aktif: <strong>{academicStats?.total_kelas || 0} Kelas</strong> tersebar di <strong>{academicStats?.total_jurusan || 0} Program Keahlian</strong>
              </span>
              <button
                type="button"
                onClick={() => onNavigateSubtab?.('kelas')}
                className="font-bold underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 cursor-pointer ml-2 shrink-0"
              >
                Buka Kelas &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 6. BLOK 6: Jejak Aktivitas Terkini (Live Mini Audit Trail) ── */}
      <HubCard
        title="Jejak Aktivitas Terkini"
        subtitle="(Audit Trail Singkat)"
        actionLabel="Lihat Semua Log"
        onAction={() => onNavigateSubtab?.('audit')}
        noPadding={true}
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {isLogsLoading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader size="sm" />
              <span>Memuat log aktivitas terbaru...</span>
            </div>
          ) : recentLogs.length > 0 ? (
            recentLogs.map((log) => {
              const meta = getLogMeta(log.action);
              const actorName = log.user?.name || 'Sistem Otomatis';
              return (
                <HubListRow
                  key={log.id}
                  icon={meta.icon}
                  iconColorClass={meta.color}
                  title={log.description || `${log.action} pada ${log.entity}`}
                  subtitle={`Oleh ${actorName} • ${formatRelativeTime(log.created_at)}`}
                  rightBadge={
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                      {log.action}
                    </span>
                  }
                  onClick={() => onNavigateSubtab?.('audit')}
                />
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              Belum ada rekaman aktivitas staf/admin baru
            </div>
          )}
        </div>
      </HubCard>
    </div>
  );
});

AdminRingkasanTab.displayName = 'AdminRingkasanTab';
