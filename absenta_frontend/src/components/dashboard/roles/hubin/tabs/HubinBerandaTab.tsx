import React, { useMemo, useCallback } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  ClipboardList,
  Award,
  Printer,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  HubCard,
  HubBentoGrid,
  HubActionGrid,
  type HubBentoCell,
  type HubActionItem,
} from '@/components/ui/hub';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import {
  TracerStudyUraian,
  TopJurusanList,
  RecentPklTable,
  TopMitraGrid,
  ActivityLogTimeline,
  PklMonitoringCycleSection,
  type HubinStats,
  type HubinActivity,
} from '@/pages/hubin/components/HubinDashboardComponents';
import type { HubinTabId } from '../types';

export interface HubinBerandaTabProps {
  stats: HubinStats | null;
  activities: HubinActivity[];
  activitiesLoading: boolean;
  loading: boolean;
  onTabSelect: (tabId: HubinTabId) => void;
}

export const HubinBerandaTab: React.FC<HubinBerandaTabProps> = React.memo(({
  stats,
  activities,
  activitiesLoading,
  loading,
  onTabSelect,
}) => {
  const handleNavigateSubtab = useCallback((rawTab: string) => {
    switch (rawTab) {
      case 'mitra':
        onTabSelect('mitra');
        break;
      case 'penempatan':
        onTabSelect('penempatan');
        break;
      case 'absensi':
        onTabSelect('absensi');
        break;
      case 'nilai':
      case 'nilai-pkl':
        onTabSelect('nilai');
        break;
      case 'bkk':
        onTabSelect('bkk');
        break;
      case 'tracer':
        onTabSelect('tracer');
        break;
      case 'rekap':
      case 'cetak':
        onTabSelect('rekap');
        break;
      case 'pengaturan':
      case 'settings':
        onTabSelect('pengaturan');
        break;
      default:
        onTabSelect('ringkasan');
        break;
    }
  }, [onTabSelect]);

  const pklSelesaiCount = useMemo(() => {
    const selesai = Number(
      stats?.pklSelesai ?? 
      stats?.penilaianStats?.selesaiPraktikCount ?? 
      Math.max(0, Number(stats?.totalSiswaPkl || 0) - Number(stats?.pklAktif || 0))
    );
    return selesai + Number(stats?.pklOverdue || 0);
  }, [stats]);

  // 1. Bento Grid 2x2 Metrik Utama (Shopee-Grade Hairline Dividers)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'totalMitra',
        title: 'Mitra Industri',
        value: `${stats?.totalMitra ?? 0} Rekanan`,
        subtext: 'DU-DI Terdaftar',
        icon: Building2,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        badge: (stats?.mouExpiringCount ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
            {stats?.mouExpiringCount} Exp
          </span>
        ) : undefined,
        onClick: () => onTabSelect('mitra'),
      },
      {
        id: 'pklAktif',
        title: 'PKL Aktif',
        value: `${stats?.pklAktif ?? 0} Siswa`,
        subtext: stats?.pklOverdue
          ? `${stats.pklOverdue} Siap Ditarik`
          : `Dari ${stats?.totalSiswaPkl || 0} Terdaftar`,
        icon: Users,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onTabSelect('penempatan'),
      },
      {
        id: 'pklSelesai',
        title: 'PKL Tuntas',
        value: `${pklSelesaiCount} Siswa`,
        subtext: 'Selesai Penempatan',
        icon: GraduationCap,
        iconColorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
        onClick: () => onTabSelect('penempatan'),
      },
      {
        id: 'lowonganBkk',
        title: 'Lowongan BKK',
        value: `${stats?.totalLowonganAktif ?? 0} Loker`,
        subtext: 'Bursa Kerja Khusus',
        icon: Briefcase,
        iconColorClass: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60',
        onClick: () => onTabSelect('bkk'),
      },
    ],
    [stats, pklSelesaiCount, onTabSelect]
  );

  // 2. Pintasan Aksi Operasional (Shopee-Grade Headerless Quick Action Slider)
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'mitra',
        label: 'Mitra Industri',
        icon: Building2,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        badge: (stats?.mouExpiringCount ?? 0) > 0 ? stats?.mouExpiringCount : undefined,
        onClick: () => onTabSelect('mitra'),
      },
      {
        id: 'penempatan',
        label: 'Penempatan PKL',
        icon: Users,
        iconColorClass: 'text-teal-600 dark:text-teal-400',
        onClick: () => onTabSelect('penempatan'),
      },
      {
        id: 'absensi',
        label: 'Monitoring Absensi',
        icon: ClipboardList,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        badge: (stats?.todayPresensi?.unverified ?? 0) > 0 ? stats?.todayPresensi?.unverified : undefined,
        onClick: () => onTabSelect('absensi'),
      },
      {
        id: 'nilai',
        label: 'Penilaian PKL',
        icon: Award,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        badge: (stats?.penilaianStats?.belumDinilai ?? 0) > 0 ? stats?.penilaianStats?.belumDinilai : undefined,
        onClick: () => onTabSelect('nilai'),
      },
      {
        id: 'bkk',
        label: 'Bursa Kerja (BKK)',
        icon: Briefcase,
        iconColorClass: 'text-sky-600 dark:text-sky-400',
        badge: (stats?.totalLowonganAktif ?? 0) > 0 ? stats?.totalLowonganAktif : undefined,
        onClick: () => onTabSelect('bkk'),
      },
      {
        id: 'tracer',
        label: 'Tracer Study',
        icon: GraduationCap,
        iconColorClass: 'text-violet-600 dark:text-violet-400',
        onClick: () => onTabSelect('tracer'),
      },
      {
        id: 'rekap',
        label: 'Cetak Dokumen',
        icon: Printer,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => onTabSelect('rekap'),
      },
    ],
    [stats, onTabSelect]
  );

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* MoU Expiring Alert Banner */}
      {stats && stats.mouExpiringCount > 0 && (
        <div className="flex items-center justify-between p-3.5 sm:p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl w-full max-w-full min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                Perhatian: MoU Rekan Industri Expiring
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                Ada {stats.mouExpiringCount} mitra industri dengan MoU yang akan berakhir dalam 30 hari kedepan.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => onTabSelect('mitra')} 
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors active:scale-[0.97] cursor-pointer shrink-0 ml-2"
          >
            <span className="hidden sm:inline">Tinjau MoU</span>
            <span className="sm:hidden">Tinjau</span>
            <ArrowRight size={10} />
          </button>
        </div>
      )}

      {/* 1. Shopee-Grade Hairline Bento Grid (2x2 / 4x1) */}
      <HubCard padding="none" variant="flat" className="overflow-hidden">
        <HubBentoGrid cells={bentoCells} />
      </HubCard>

      {/* 2. Shopee-Grade Headerless Quick Action Slider */}
      <HubCard padding="compact" variant="flat">
        <HubActionGrid
          items={actionItems}
          columns={7}
          variant="slider"
        />
      </HubCard>

      {/* 3. Siklus Pelaksanaan & Evaluasi PKL (Presensi & Penilaian Terpadu) */}
      <PklMonitoringCycleSection stats={stats} onNavigateTab={handleNavigateSubtab} />

      {/* 4. Serapan Tracer Study & Top Program Keahlian */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full min-w-0">
        <AnalyticsCard
          title="Coverage Tracer Study"
          value={`${stats?.tracerCoverage?.toFixed(1) || 0}%`}
          icon={<GraduationCap />}
          gradient="from-indigo-500 to-indigo-600"
          subtitle={`${stats?.totalAlumniTraced || 0} alumni terlacak`}
          variant="compact-premium"
          mobileCompact={true}
          className="w-full min-w-0"
        />
        <AnalyticsCard
          title="Serapan Kerja Alumni"
          value={`${stats?.employmentRate?.toFixed(1) || 0}%`}
          icon={<TrendingUp />}
          gradient="from-emerald-500 to-emerald-600"
          subtitle="Bekerja & Wirausaha"
          variant="compact-premium"
          mobileCompact={true}
          className="w-full min-w-0"
        />
        <AnalyticsCard
          title="Rekrutmen Sukses BKK"
          value={`${stats?.totalRecruitmentSuccess || 0} siswa`}
          icon={<Award />}
          gradient="from-sky-500 to-sky-600"
          subtitle="Diterima bekerja di industri"
          variant="compact-premium"
          mobileCompact={true}
          className="w-full min-w-0"
        />
      </div>

      {/* 5. Uraian Tracer Study & Top Jurusan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full max-w-full min-w-0">
        <div className="lg:col-span-1 min-w-0">
          <TracerStudyUraian stats={stats} onNavigateTab={handleNavigateSubtab} />
        </div>
        <div className="lg:col-span-2 min-w-0">
          <TopJurusanList stats={stats} />
        </div>
      </div>

      {/* 6. Aktivitas Penempatan Siswa PKL & Partner Teratas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full max-w-full min-w-0">
        <div className="lg:col-span-2 min-w-0">
          <RecentPklTable stats={stats} onNavigateTab={handleNavigateSubtab} />
        </div>
        <div className="lg:col-span-1 min-w-0">
          <TopMitraGrid stats={stats} />
        </div>
      </div>

      {/* 7. Log Aktivitas Hubin Terbaru (Audit Trail) */}
      <ActivityLogTimeline activities={activities} activitiesLoading={activitiesLoading} />
    </div>
  );
});

HubinBerandaTab.displayName = 'HubinBerandaTab';
