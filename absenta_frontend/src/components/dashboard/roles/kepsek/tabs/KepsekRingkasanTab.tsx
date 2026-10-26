import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  PlayCircle,
  AlertTriangle,
  Building,
  Briefcase,
  HeartHandshake,
  FileText,
  Mail,
  ShieldCheck,
  LayoutDashboard,
  TrendingUp,
  Activity,
  Trophy,
  ArrowUpRight,
} from 'lucide-react';
import {
  HubCard,
  HubBentoGrid,
  HubActionGrid,
  type HubBentoCell,
  type HubActionItem,
} from '@/components/ui/hub';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CompactSectionCard } from '../../shared/CompactSectionCard';
import { MonitoringKbmWidget } from '../../shared/MonitoringKbmWidget';
import type { KepsekTabId } from '../types';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#fbbf24', '#ef4444', '#8b5cf6', '#06b6d4'];

export interface KepsekRingkasanTabProps {
  stats: any;
  chartData: any;
  escalations: any[];
  sarprasData: any;
  hubinData: any;
  teacherLeaderboard: any[];
  onTabSelect: (tabId: KepsekTabId) => void;
  onOpenTeacherLeaderboard: () => void;
}

export const KepsekRingkasanTab: React.FC<KepsekRingkasanTabProps> = React.memo(({
  stats,
  chartData,
  escalations,
  sarprasData,
  hubinData,
  teacherLeaderboard,
  onTabSelect,
  onOpenTeacherLeaderboard,
}) => {
  const navigate = useNavigate();

  const guruAttendance = useMemo(
    () => (stats?.total_guru ? Math.round((stats.guru_hadir / stats.total_guru) * 100) : 0),
    [stats?.total_guru, stats?.guru_hadir]
  );
  const siswaAttendance = useMemo(
    () => (stats?.total_siswa ? Math.round((stats.siswa_hadir / stats.total_siswa) * 100) : 0),
    [stats?.total_siswa, stats?.siswa_hadir]
  );

  // 1. Bento Grid Cells (Executive KPI 2x2 or 4x1)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'siswaHadir',
        title: 'Hadir Siswa',
        value: `${siswaAttendance}%`,
        subtext: `${stats?.siswa_hadir || 0} / ${stats?.total_siswa || 0} Siswa`,
        icon: Users,
        iconColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
        badge: (stats?.siswa_alpa ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
            {stats?.siswa_alpa} Alpa
          </span>
        ) : undefined,
        onClick: () => onTabSelect('kbm'),
      },
      {
        id: 'guruHadir',
        title: 'Hadir Guru',
        value: `${guruAttendance}%`,
        subtext: `${stats?.guru_hadir || 0} / ${stats?.total_guru || 0} Bertugas`,
        icon: CheckCircle,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onTabSelect('kbm'),
      },
      {
        id: 'kbmLive',
        title: 'Sesi KBM Live',
        value: `${stats?.total_sesi_aktif || 0} Kelas`,
        subtext: 'Sedang Berlangsung',
        icon: PlayCircle,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => onTabSelect('kbm'),
      },
      {
        id: 'eskalasi',
        title: 'Eskalasi Kasus',
        value: `${escalations.length} Kasus`,
        subtext: escalations.length > 0 ? 'Perlu Tindakan' : 'Semua Terkendali',
        icon: AlertTriangle,
        iconColorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
        badge: escalations.length > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
            Atensi
          </span>
        ) : undefined,
        onClick: () => onTabSelect('kesiswaan'),
      },
    ],
    [stats, siswaAttendance, guruAttendance, escalations, onTabSelect]
  );

  // 2. Shopee Quick Action Slider
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'kbm',
        label: 'KBM & Guru',
        icon: PlayCircle,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onTabSelect('kbm'),
      },
      {
        id: 'kesiswaan',
        label: 'Kesiswaan',
        icon: Users,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => onTabSelect('kesiswaan'),
      },
      {
        id: 'bk',
        label: 'Konseling BK',
        icon: HeartHandshake,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        onClick: () => onTabSelect('bk'),
      },
      {
        id: 'sarpras',
        label: 'Sarpras Aset',
        icon: Building,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onTabSelect('sarpras'),
      },
      {
        id: 'hubin',
        label: 'Hubin PKL',
        icon: Briefcase,
        iconColorClass: 'text-teal-600 dark:text-teal-400',
        onClick: () => onTabSelect('hubin'),
      },
      {
        id: 'tu',
        label: 'Tata Usaha',
        icon: FileText,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        onClick: () => onTabSelect('tu'),
      },
      {
        id: 'disposisi',
        label: 'Disposisi Surat',
        icon: Mail,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => navigate('/correspondence/dashboard'),
      },
      {
        id: 'rekap',
        label: 'Pusat Laporan',
        icon: FileText,
        iconColorClass: 'text-slate-600 dark:text-slate-400',
        onClick: () => navigate('/reports'),
      },
    ],
    [onTabSelect, navigate]
  );

  // Trend Data Bulanan
  const trendData = useMemo(() => {
    if (!chartData?.data) return [];
    const labels = chartData.data.labels || [];
    const datasets = chartData.data.datasets || [];
    return labels.map((label: string, index: number) => {
      const item: any = { name: label };
      datasets.forEach((dataset: any) => {
        const key = dataset.label.toLowerCase().includes('guru') ? 'Guru' : 'Siswa';
        item[key] = dataset.data[index];
      });
      return item;
    });
  }, [chartData]);

  // Distribusi Siswa Harian
  const distributionData = useMemo(
    () =>
      [
        { name: 'Hadir', value: stats?.siswa_hadir || 0 },
        { name: 'Sakit', value: stats?.siswa_sakit || 0 },
        { name: 'Izin', value: stats?.siswa_izin || 0 },
        { name: 'Alpa', value: stats?.siswa_alpa || 0 },
      ].filter((d) => d.value > 0),
    [stats?.siswa_hadir, stats?.siswa_sakit, stats?.siswa_izin, stats?.siswa_alpa]
  );

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Bento Grid Executive KPI */}
      <HubBentoGrid cells={bentoCells} columns={4} />

      {/* 2. Shopee Quick Action Slider */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 px-2 shadow-xs">
        <HubActionGrid items={actionItems} variant="slider" />
      </div>

      {/* 3. Grafik Kehadiran & Distribusi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tren Kehadiran Bulanan */}
        <CompactSectionCard title="Tren Kehadiran Sekolah (Guru vs Siswa)" icon={TrendingUp} iconColor="blue">
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer minWidth={0} width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="Siswa" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Guru" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CompactSectionCard>

        {/* Distribusi Kehadiran Siswa Hari Ini */}
        <CompactSectionCard title="Distribusi Kehadiran Siswa Hari Ini" icon={Users} iconColor="indigo">
          <div className="flex flex-col sm:flex-row items-center gap-6 h-52">
            <div className="w-full sm:w-1/2 h-44">
              <ResponsiveContainer minWidth={0} width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {distributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-2">
              {distributionData.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 font-bold uppercase">{item.name}</span>
                  </div>
                  <span className="font-black text-slate-900 dark:text-white">{item.value} Siswa</span>
                </div>
              ))}
            </div>
          </div>
        </CompactSectionCard>
      </div>

      {/* 4. Monitoring KBM Live Real-Time */}
      <HubCard
        title="Monitoring KBM Live Real-Time"
        headerAction={
          <Badge variant="outline" className="text-[10px] font-bold">
            Live Connected
          </Badge>
        }
      >
        <MonitoringKbmWidget isExecutive={true} />
      </HubCard>

      {/* 5. Klasemen Kedisiplinan & Kinerja PTK (Top 5 Guru) */}
      <HubCard
        title="Klasemen Kedisiplinan & Kinerja PTK (Guru)"
        headerAction={
          <Button
            size="toolbar"
            variant="toolbarOutline"
            onClick={onOpenTeacherLeaderboard}
            className="text-xs font-semibold gap-1.5"
          >
            <span>Klasemen Lengkap</span>
            <ArrowUpRight size={14} />
          </Button>
        }
      >
        {teacherLeaderboard.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {teacherLeaderboard.slice(0, 5).map((teacher: any, idx: number) => {
              const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              return (
                <div
                  key={teacher.id || idx}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black">{rankMedal}</span>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                      >
                        {teacher.points || 0} Poin
                      </Badge>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 truncate">
                      {teacher.nama}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">
                      {teacher.nip ? `NIP: ${teacher.nip}` : 'Pendidik'}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[10px] font-medium text-slate-500">
                    <span>Sesi: {teacher.kbm_count || 0} KBM</span>
                    <span>Hadir: {teacher.hadir_count || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs font-medium italic">
            Memuat data peringkat kedisiplinan guru...
          </div>
        )}
      </HubCard>
    </div>
  );
});

KepsekRingkasanTab.displayName = 'KepsekRingkasanTab';
