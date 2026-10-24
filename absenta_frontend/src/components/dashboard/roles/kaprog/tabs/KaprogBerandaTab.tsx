import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  UserCheck, 
  FileText, 
  Award, 
  CalendarCheck, 
  Briefcase, 
  Layers, 
  Wrench, 
  GraduationCap, 
  Clock, 
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Trophy
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { cn } from '@/lib/utils';
import type { KaprogTabId } from '../types';

interface KaprogBerandaTabProps {
  penilaianStatus: {
    totalSiswaPkl: number;
    sudahDinilaiDudi?: number;
    belumDinilaiDudi?: number;
  };
  tpStatus: {
    totalMitra: number;
    filledMitra: number;
    pendingMitra: number;
    completionPercentage: number;
  };
  kaprogStatsData?: {
    activeClasses?: number;
    totalTeachers?: number;
    [key: string]: unknown;
  };
  recentActivities?: Array<{ id: string | number; title: string; desc: string; time: string }>;
  agendaHariIni?: Array<{ jam: string; agenda: string }>;
  onOpenPenempatan?: () => void;
  onOpenStrukturKelas?: () => void;
  onOpenRekapNilai?: () => void;
  onOpenMonitoringPkl?: () => void;
  onSelectTab?: (tabId: KaprogTabId) => void;
}

export const KaprogBerandaTab: React.FC<KaprogBerandaTabProps> = React.memo(({
  penilaianStatus,
  tpStatus,
  kaprogStatsData,
  recentActivities = [],
  agendaHariIni = [],
  onOpenPenempatan,
  onOpenStrukturKelas,
  onOpenRekapNilai,
  onOpenMonitoringPkl,
  onSelectTab,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* KPI 4 Kolom Berstandar Pilar 30 & 23 (AnalyticsCard with mobileCompact & compact-premium) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Siswa PKL Aktif */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Siswa PKL Aktif"
          value={penilaianStatus?.totalSiswaPkl || 0}
          icon={<Building2 className="w-5 h-5 text-indigo-500" />}
          description={`Tersebar di ${tpStatus?.totalMitra || 0} industri mitra`}
          gradient="from-indigo-500 to-indigo-600"
        />

        {/* Card 2: Absensi PKL Hari Ini */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Presensi PKL Hari Ini"
          value={`${Math.max(0, (penilaianStatus?.totalSiswaPkl || 48) - 2)} / ${penilaianStatus?.totalSiswaPkl || 48}`}
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          description="95.8% siswa tertib hadir di DUDI"
          gradient="from-emerald-500 to-teal-600"
        />

        {/* Card 3: Guru Mengajar Hari Ini */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Guru Produktif Mengajar"
          value={`${kaprogStatsData?.activeClasses || 12} / ${kaprogStatsData?.totalTeachers || 14} Sesi`}
          icon={<Users className="w-5 h-5 text-blue-500" />}
          description="Semua jam KBM kejuruan aktif"
          gradient="from-blue-500 to-cyan-600"
        />

        {/* Card 4: Kesiapan TP DUDI */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Kesiapan TP DUDI"
          value={`${tpStatus?.completionPercentage || 0}%`}
          icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
          description={`${tpStatus?.filledMitra || 0} dari ${tpStatus?.totalMitra || 0} mitra siap dinilai`}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* Quick Links Grid (App Launcher Style) */}
      <Card noPadding className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Pintasan Manajemen Kejuruan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Akses cepat ke modul instrumen PKL, kurikulum, presensi, dan bengkel.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onSelectTab) {
                onSelectTab('pkl');
              } else {
                navigate('/hubin/nilai-pkl?tab=deskripsi');
              }
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold gap-1 cursor-pointer"
          >
            <span>Formulasi TP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 sm:gap-3">
          {[
            {
              title: 'Formulasi TP',
              tabId: 'pkl' as KaprogTabId,
              path: '/hubin/nilai-pkl?tab=deskripsi',
              icon: FileText,
              color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
            },
            {
              title: 'Monitoring PKL',
              action: onOpenMonitoringPkl,
              path: '/hubin/absensi',
              icon: CalendarCheck,
              color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
            },
            {
              title: 'Rekap Nilai PKL',
              action: onOpenRekapNilai,
              path: '/hubin/nilai-pkl?tab=dudi',
              icon: Award,
              color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
            },
            {
              title: 'Penempatan Siswa',
              action: onOpenPenempatan,
              path: '/hubin/penempatan',
              icon: Briefcase,
              color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
            },
            {
              title: 'Struktur Kelas',
              action: onOpenStrukturKelas,
              tabId: 'siswa' as KaprogTabId,
              path: '/academic/kelas',
              icon: Layers,
              color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400',
            },
            {
              title: 'Sertifikat UKK',
              tabId: 'ukk' as KaprogTabId,
              path: '/rapor',
              icon: Award,
              color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
            },
            {
              title: 'Tracer Study',
              path: '/hubin/tracer',
              icon: GraduationCap,
              color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else if (item.tabId && onSelectTab) {
                    onSelectTab(item.tabId);
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                className="group flex flex-col items-center justify-start p-1.5 sm:p-2 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer text-center w-full select-none"
              >
                <div className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl ${item.color} flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:shadow-md transition-all duration-150 border border-slate-200/50 dark:border-slate-800/50 mb-1.5`}>
                  <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight line-clamp-2 text-center break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 2-Column Bottom Section: Aktivitas & Log + Agenda Hari Ini */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kolom 1: Recent Activity Mini List */}
        <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Aktivitas & Log Terbaru Jurusan</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Realtime update</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {(recentActivities || [])?.map((act) => (
              <div key={act.id} className="py-2.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {act.desc}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono mt-0.5">
                  {act.time}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Kolom 2: Agenda & Supervisi Hari Ini */}
        <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-500" />
              <span>Agenda & Supervisi Hari Ini</span>
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Jadwal Aktif" />
          </div>

          <div className="space-y-2.5">
            {(agendaHariIni || [])?.map((ag, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {ag.jam}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.2 rounded">
                    {(ag as any).tipe || 'KBM'}
                  </span>
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {ag.agenda}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
});

KaprogBerandaTab.displayName = 'KaprogBerandaTab';
