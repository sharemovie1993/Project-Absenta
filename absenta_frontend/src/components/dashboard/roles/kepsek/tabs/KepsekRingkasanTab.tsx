import React, { useMemo, useState, lazy, Suspense } from 'react';
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
  Activity,
  Trophy,
  ArrowUpRight,
  Send,
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
import { PersonPhoto } from '@/components/ui/PersonPhoto';
import { cn } from '@/lib/utils';
import { CompactSectionCard } from '@/components/dashboard/shared/CompactSectionCard';
import { MonitoringKbmWidget } from '@/components/dashboard/shared/MonitoringKbmWidget';
import { SchoolAttendanceAnalytics } from '@/components/dashboard/shared/SchoolAttendanceAnalytics';
import type { KepsekTabId } from '../types';

const DailyExecutiveBriefingModal = lazy(
  () => import('@/components/reporting/daily-briefing/DailyExecutiveBriefingModal')
);

export interface KepsekRingkasanTabProps {
  stats: any;
  chartData: any;
  teacherChartData?: any;
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
  teacherChartData,
  escalations,
  sarprasData,
  hubinData,
  teacherLeaderboard,
  onTabSelect,
  onOpenTeacherLeaderboard,
}) => {
  const navigate = useNavigate();
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);

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
        id: 'daily_briefing',
        label: 'Ringkasan Harian WA',
        icon: Send,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => setIsBriefingOpen(true),
      },
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

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Bento Grid Executive KPI */}
      <HubBentoGrid cells={bentoCells} columns={4} />

      {/* 2. Shopee Quick Action Slider */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 px-2 shadow-xs">
        <HubActionGrid items={actionItems} variant="slider" />
      </div>

      {isBriefingOpen && (
        <Suspense fallback={null}>
          <DailyExecutiveBriefingModal
            isOpen={isBriefingOpen}
            onClose={() => setIsBriefingOpen(false)}
          />
        </Suspense>
      )}

      {/* 3. Grafik Kehadiran & Distribusi (Komponen Terpadu Admin & Kepsek) */}
      <SchoolAttendanceAnalytics
        studentChartData={chartData}
        teacherChartData={teacherChartData}
        stats={stats}
      />

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
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-black">{rankMedal}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-black uppercase",
                          teacher.points > 0
                            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40"
                            : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {teacher.points > 0 ? `${teacher.points} Pts` : teacher.status_keaktifan === 'BELUM_ADA_SESI' ? 'Belum Ada Sesi' : '0 Pts'}
                      </Badge>
                    </div>
                    <PersonPhoto
                      name={teacher.nama}
                      foto={teacher.foto}
                      variant="circle"
                      size="sm"
                      showName={true}
                      subtitle={teacher.nip && teacher.nip !== '-' ? `NIP: ${teacher.nip}` : 'Pendidik'}
                    />
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[10px] font-medium text-slate-500">
                    <span>
                      {teacher.kbm_total > 0
                        ? `Hadir: ${teacher.kbm_count}/${teacher.kbm_total} (${teacher.kbm_rate || 0}%)`
                        : teacher.hadir_count > 0
                        ? `Hadir: ${teacher.hadir_count}x`
                        : 'Belum Ada Sesi'}
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      {teacher.jurnal_count > 0 ? `Jurnal: ${teacher.jurnal_count}` : teacher.score > 0 ? `${teacher.score}% Indeks` : '-'}
                    </span>
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
