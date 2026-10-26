import React, { useMemo } from 'react';
import {
  Briefcase,
  Users,
  GraduationCap,
  Building2,
  TrendingUp,
  ChevronRight,
  Plus,
  CalendarCheck,
  Printer,
  Clock,
  Sparkles,
  FileCheck2,
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
import type { BkkTabId, BkkStats } from '../types';

export interface BkkBerandaTabProps {
  stats: BkkStats | null;
  loading: boolean;
  onTabSelect: (tabId: BkkTabId) => void;
  onCreateJob?: () => void;
}

export const BkkBerandaTab: React.FC<BkkBerandaTabProps> = React.memo(({
  stats,
  loading,
  onTabSelect,
  onCreateJob,
}) => {
  // 1. Bento Grid Executive KPI (Shopee-Grade Hairline 2x2 or 4x1)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'activeJobs',
        title: 'Lowongan Aktif',
        value: `${stats?.active_jobs ?? 0} Loker`,
        subtext: 'Bursa Kerja Terbuka',
        icon: Briefcase,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        badge: (stats?.active_jobs ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
            Aktif
          </span>
        ) : undefined,
        onClick: () => onTabSelect('loker'),
      },
      {
        id: 'totalApplicants',
        title: 'Pelamar Terdaftar',
        value: `${stats?.total_applicants ?? 0} Berkas`,
        subtext: (stats?.pending_interviews ?? 0) > 0 ? `${stats?.pending_interviews} Butuh Review` : 'Lamaran Masuk',
        icon: Users,
        iconColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
        badge: (stats?.pending_interviews ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500 text-white">
            Review
          </span>
        ) : undefined,
        onClick: () => onTabSelect('pelamar'),
      },
      {
        id: 'tracerAbsorption',
        title: 'Serapan Alumni',
        value: `${stats?.tracer_absorbed_pct ?? '84.5%'}`,
        subtext: 'Bekerja & Wirausaha',
        icon: TrendingUp,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => onTabSelect('tracer'),
      },
      {
        id: 'totalMitra',
        title: 'Mitra DU/DI',
        value: `${stats?.total_mitra ?? 0} PT`,
        subtext: 'Penyalur Resmi',
        icon: Building2,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        onClick: () => onTabSelect('mitra'),
      },
    ],
    [stats, onTabSelect]
  );

  // 2. Shopee Quick Action Slider
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'loker',
        label: 'Lowongan Kerja',
        icon: Briefcase,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onTabSelect('loker'),
      },
      {
        id: 'pelamar',
        label: 'Verifikasi Pelamar',
        icon: Users,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        onClick: () => onTabSelect('pelamar'),
      },
      {
        id: 'tracer',
        label: 'Tracer Study',
        icon: GraduationCap,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        onClick: () => onTabSelect('tracer'),
      },
      {
        id: 'mitra',
        label: 'Mitra DU/DI',
        icon: Building2,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onTabSelect('mitra'),
      },
      {
        id: 'rekap',
        label: 'Laporan BKK',
        icon: Printer,
        iconColorClass: 'text-slate-600 dark:text-slate-400',
        onClick: () => onTabSelect('rekap'),
      },
    ],
    [onTabSelect]
  );

  const recentJobs = stats?.recent_jobs || [];

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Bento Grid Executive KPI */}
      <HubBentoGrid cells={bentoCells} columns={4} />

      {/* 2. Shopee Quick Action Slider */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 px-2 shadow-xs">
        <HubActionGrid items={actionItems} variant="slider" />
      </div>

      {/* 3. Feeds: Lowongan Kerja Terbaru & Distribusi Keterserapan Alumni */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Lowongan Kerja Terbaru */}
        <div className="lg:col-span-2">
          <HubCard
            title="Lowongan Kerja Rekanan Terbaru"
            headerAction={
              <div className="flex items-center gap-2">
                {onCreateJob && (
                  <Button
                    variant="toolbarPrimary"
                    size="toolbar"
                    onClick={onCreateJob}
                    className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus size={14} className="mr-1" />
                    Pasang Loker
                  </Button>
                )}
                <Button
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => onTabSelect('loker')}
                  className="text-xs font-semibold"
                >
                  Semua Loker
                  <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            }
          >
            <div className="space-y-2.5">
              {recentJobs.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center">
                  <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Belum Ada Lowongan Aktif
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Klik Pasang Loker untuk mendaftarkan kesempatan kerja dari mitra industri.
                  </p>
                </div>
              ) : (
                recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                        <Briefcase size={16} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {job.judul_posisi}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                          {job.perusahaan_nama}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                          <span>Kuota: {job.kuota} Orang</span>
                          <span>•</span>
                          <span>Tutup: {job.tanggal_tutup ? new Date(job.tanggal_tutup).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0">
                      {job.status || 'DIBUKA'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </HubCard>
        </div>

        {/* Right 1 Col: Distribusi Keterserapan Alumni BMW */}
        <div className="space-y-4">
          <HubCard
            title="Keterserapan Alumni (BMW)"
            headerAction={
              <Button
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => onTabSelect('tracer')}
                className="text-xs font-semibold"
              >
                Tracer
                <ChevronRight size={14} className="ml-1" />
              </Button>
            }
          >
            <div className="space-y-3 p-1">
              {/* Bekerja */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Bekerja di Industri</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {stats?.alumni_working ?? 62}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${stats?.alumni_working ?? 62}%` }}
                  />
                </div>
              </div>

              {/* Melanjutkan Kuliah */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Melanjutkan Kuliah (PT)</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {stats?.alumni_studying ?? 18}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${stats?.alumni_studying ?? 18}%` }}
                  />
                </div>
              </div>

              {/* Wirausaha */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Wirausaha Mandiri</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {stats?.alumni_entrepreneur ?? 12}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${stats?.alumni_entrepreneur ?? 12}%` }}
                  />
                </div>
              </div>

              {/* Mencari Kerja */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Masa Tunggu / Mencari</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {stats?.alumni_seeking ?? 8}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${stats?.alumni_seeking ?? 8}%` }}
                  />
                </div>
              </div>
            </div>
          </HubCard>
        </div>
      </div>
    </div>
  );
});

BkkBerandaTab.displayName = 'BkkBerandaTab';
