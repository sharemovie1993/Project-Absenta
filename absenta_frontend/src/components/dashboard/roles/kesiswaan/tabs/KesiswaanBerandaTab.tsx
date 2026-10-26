import React, { useMemo, useState, lazy, Suspense } from 'react';
import {
  Clock,
  ShieldAlert,
  Users,
  TrendingUp,
  Trophy,
  HeartPulse,
  Award,
  FileSpreadsheet,
  Printer,
  Plus,
  CheckCircle2,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  HubCard,
  HubBentoGrid,
  HubActionGrid,
  type HubBentoCell,
  type HubActionItem,
} from '@/components/ui/hub';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/utils/layoutUtils';
import type { Pelanggaran } from '@/api/kesiswaan.api';
import type { CareStudentItem, LeaderboardItem } from '@/components/kesiswaan/monitoring/CareSpotlightSection';
import type { MonthlyTrendItem } from '@/components/kesiswaan/monitoring/MonthlyTrendChart';
import { PiketAgendaPanel, RombelDisiplinPanel } from '@/pages/kesiswaan/components/MonitoringKesiswaanComponents';
import type { KesiswaanTabId } from '../types';

// Lazy load heavy subcomponents (Pilar 21)
const CareSpotlightSection = lazy(() =>
  import('@/components/kesiswaan/monitoring/CareSpotlightSection').then((m) => ({ default: m.CareSpotlightSection }))
);
const MonthlyTrendChart = lazy(() =>
  import('@/components/kesiswaan/monitoring/MonthlyTrendChart').then((m) => ({ default: m.MonthlyTrendChart }))
);
const CatatPelanggaranModal = lazy(() =>
  import('@/components/kesiswaan/modals/CatatPelanggaranModal').then((m) => ({ default: m.CatatPelanggaranModal }))
);
const TindakMasalPelanggaranModal = lazy(() =>
  import('@/components/kesiswaan/modals/TindakMasalPelanggaranModal').then((m) => ({ default: m.TindakMasalPelanggaranModal }))
);

export interface KesiswaanBerandaTabProps {
  stats: {
    today: number;
    severe: number;
    totalPoints: number;
    needDiscipline: number;
  };
  violationsRaw: any;
  leaderboardRaw: any;
  analyticsRaw: any;
  isLoading: boolean;
  isLoadingLeaderboard: boolean;
  isLoadingAnalytics: boolean;
  onTabSelect: (tabId: KesiswaanTabId) => void;
}

export const KesiswaanBerandaTab: React.FC<KesiswaanBerandaTabProps> = React.memo(({
  stats,
  violationsRaw,
  leaderboardRaw,
  analyticsRaw,
  isLoading,
  isLoadingLeaderboard,
  isLoadingAnalytics,
  onTabSelect,
}) => {
  const [spotlightTab, setSpotlightTab] = useState<'violations' | 'achievements'>('violations');
  const [catatModalOpen, setCatatModalOpen] = useState(false);
  const [tindakMasalModalOpen, setTindakMasalModalOpen] = useState(false);

  const recentViolations = useMemo((): Pelanggaran[] => {
    return violationsRaw?.data?.list?.slice(0, 5) || [];
  }, [violationsRaw]);

  const careStudents = useMemo((): CareStudentItem[] => {
    if (!violationsRaw?.data?.list) return [];
    const studentPoints: Record<string, { id: string; name: string; class: string; points: number }> = {};
    violationsRaw.data.list.forEach((v: Pelanggaran) => {
      const id = v.siswa_id;
      if (!studentPoints[id]) {
        studentPoints[id] = {
          id,
          name: v.Siswa?.nama_siswa || 'Unknown',
          class: v.Siswa?.Kelas?.nama_kelas || '-',
          points: 0,
        };
      }
      studentPoints[id].points += v.poin;
    });
    return Object.values(studentPoints).sort((a, b) => b.points - a.points).slice(0, 5);
  }, [violationsRaw]);

  const monthlyTrend = useMemo((): MonthlyTrendItem[] => {
    return (analyticsRaw?.data?.trend_bulanan as MonthlyTrendItem[]) || [];
  }, [analyticsRaw]);

  const leaderboardData = useMemo((): LeaderboardItem[] => {
    return (leaderboardRaw?.data as LeaderboardItem[]) || [];
  }, [leaderboardRaw]);

  const maxCases = useMemo(() => {
    if (monthlyTrend.length === 0) return 1;
    return Math.max(...(monthlyTrend?.map((m: MonthlyTrendItem) => m.total_kasus) || [1]), 1);
  }, [monthlyTrend]);

  // 1. Bento Grid 2x2 Metrik Utama (Shopee-Grade Hairline Dividers)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'today',
        title: 'Pelanggaran Hari Ini',
        value: `${stats.today} Kasus`,
        subtext: stats.today > 0 ? 'Catatan Masuk Hari Ini' : 'Kondusif Terjaga',
        icon: Clock,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        badge: stats.today > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
            {stats.today}
          </span>
        ) : undefined,
        onClick: () => onTabSelect('pelanggaran'),
      },
      {
        id: 'needDiscipline',
        title: 'Butuh Pembinaan',
        value: `${stats.needDiscipline} Siswa`,
        subtext: 'Menunggu Tindakan Disiplin',
        icon: ShieldAlert,
        iconColorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
        badge: stats.needDiscipline > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
            {stats.needDiscipline}
          </span>
        ) : undefined,
        onClick: () => onTabSelect('pelanggaran'),
      },
      {
        id: 'severe',
        title: 'Kasus Berat',
        value: `${stats.severe} Kasus`,
        subtext: 'Bobot Poin ≥ 25 Poin',
        icon: Users,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        badge: stats.severe > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white">
            {stats.severe}
          </span>
        ) : undefined,
        onClick: () => onTabSelect('pelanggaran'),
      },
      {
        id: 'totalPoints',
        title: 'Akumulasi Poin',
        value: `${stats.totalPoints.toLocaleString('id-ID')} Poin`,
        subtext: 'Total Bobot Poin Seluruh Rombel',
        icon: TrendingUp,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onTabSelect('pelanggaran'),
      },
    ],
    [stats, onTabSelect]
  );

  // 2. Pintasan Aksi Operasional (Shopee-Grade Headerless Quick Action Slider)
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'pelanggaran',
        label: 'Pelanggaran',
        icon: ShieldAlert,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        badge: stats.today > 0 ? stats.today : undefined,
        onClick: () => onTabSelect('pelanggaran'),
      },
      {
        id: 'prestasi',
        label: 'Prestasi Siswa',
        icon: Trophy,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        badge: leaderboardData.length > 0 ? leaderboardData.length : undefined,
        onClick: () => onTabSelect('prestasi'),
      },
      {
        id: 'dhuha',
        label: 'Pembiasaan Dhuha',
        icon: HeartPulse,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onTabSelect('dhuha'),
      },
      {
        id: 'ketarunaan',
        label: 'Ketarunaan',
        icon: Award,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        onClick: () => onTabSelect('ketarunaan'),
      },
      {
        id: 'tatib',
        label: 'Tata Tertib',
        icon: FileSpreadsheet,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onTabSelect('tatib'),
      },
      {
        id: 'rekap',
        label: 'Cetak Dokumen',
        icon: Printer,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        onClick: () => onTabSelect('rekap'),
      },
      {
        id: 'catat_pelanggaran',
        label: 'Catat Kasus',
        icon: Plus,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => setCatatModalOpen(true),
      },
      {
        id: 'tindak_masal',
        label: 'Tindak Masal',
        icon: CheckCircle2,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => setTindakMasalModalOpen(true),
      },
    ],
    [stats.today, leaderboardData.length, onTabSelect]
  );

  return (
    <div className="space-y-4">
      {/* === ZONE 1: METRIK UTAMA (BENTO GRID 2x2) === */}
      <HubCard noPadding>
        <HubBentoGrid cells={bentoCells} columns={4} />
      </HubCard>

      {/* === ZONE 2: SHOPEE-GRADE QUICK ACTION SLIDER === */}
      <HubCard bodyClassName="py-2.5 sm:py-3 px-2 sm:px-3">
        <HubActionGrid
          items={actionItems}
          columns={4}
          variant="slider"
          iconSize="md"
          labelSize="xs"
        />
      </HubCard>

      {/* === ZONE 3: PAPAN INFORMASI PIKET & AGENDA HARIAN === */}
      <PiketAgendaPanel />

      {/* === ZONE 4: LIVE ACTIVITY & CARE SPOTLIGHT === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Kolom Kiri: Catatan Pelanggaran Terkini (Live Feed) */}
        <div className="lg:col-span-7 flex">
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between w-full">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                      Catatan Pelanggaran Terkini
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      Aktivitas penegakan disiplin real-time
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Feed
                  </span>
                  <button
                    type="button"
                    onClick={() => onTabSelect('pelanggaran')}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline hidden sm:inline-block cursor-pointer"
                  >
                    Buku Catatan →
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {isLoading ? (
                  [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
                ) : recentViolations.length > 0 ? (
                  recentViolations.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                            v.poin >= 25
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {v.Siswa?.nama_siswa ? v.Siswa.nama_siswa.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                              {v.Siswa?.nama_siswa}
                            </h4>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                              {v.Siswa?.Kelas?.nama_kelas || '-'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                            {v.jenis_pelanggaran} {v.catatan ? `• ${v.catatan}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-rose-600 dark:text-rose-400 text-xs block">
                          +{v.poin} Poin
                        </span>
                        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                          {v.created_at
                            ? formatDate(v.created_at, { hour: '2-digit', minute: '2-digit' })
                            : 'Hari ini'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/20 flex flex-col items-center justify-center space-y-1.5">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                      Belum Ada Pelanggaran Hari Ini
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      Seluruh siswa menjaga ketertiban sekolah dengan sangat kondusif.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {recentViolations.length > 0 && (
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[11px]">
                  Menampilkan {recentViolations.length} catatan terbaru
                </span>
                <button
                  type="button"
                  onClick={() => onTabSelect('pelanggaran')}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Lihat Semua Catatan →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Care Spotlight & Pembinaan Siswa */}
        <div className="lg:col-span-5 flex">
          <Suspense fallback={<Skeleton className="h-full w-full rounded-2xl" />}>
            <CareSpotlightSection
              spotlightTab={spotlightTab}
              setSpotlightTab={setSpotlightTab}
              careStudents={careStudents}
              leaderboardData={leaderboardData}
              isLoading={isLoading}
              isLoadingLeaderboard={isLoadingLeaderboard}
              onNavigateToPelanggaran={() => onTabSelect('pelanggaran')}
            />
          </Suspense>
        </div>
      </div>

      {/* === ZONE 5: ANALITIK KEPATUHAN ROMBEL & TREN BULANAN === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-5 flex">
          <RombelDisiplinPanel violations={violationsRaw} analytics={analyticsRaw} />
        </div>
        <div className="lg:col-span-7 flex">
          <Suspense fallback={<Skeleton className="h-full w-full rounded-2xl" />}>
            <MonthlyTrendChart
              monthlyTrend={monthlyTrend}
              maxCases={maxCases}
              isLoadingAnalytics={isLoadingAnalytics}
            />
          </Suspense>
        </div>
      </div>

      {/* Modal Pencatatan Kilat Pelanggaran (Quick Entry) */}
      <Suspense fallback={null}>
        <CatatPelanggaranModal
          isOpen={catatModalOpen}
          onClose={() => setCatatModalOpen(false)}
        />
      </Suspense>

      {/* Modal Penindakan Masal (Bulk Discipline Action) */}
      <Suspense fallback={null}>
        <TindakMasalPelanggaranModal
          isOpen={tindakMasalModalOpen}
          onClose={() => setTindakMasalModalOpen(false)}
        />
      </Suspense>
    </div>
  );
});
