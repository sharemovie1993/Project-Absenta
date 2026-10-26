import React, { useMemo } from 'react';
import {
  CalendarDays,
  Users,
  LayoutGrid,
  BookOpen,
  Calendar,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HubCard,
  HubBentoGrid,
  HubActionGrid,
  type HubBentoCell,
  type HubActionItem,
} from '@/components/ui/hub';
import { MonitoringKbmWidget } from '@/components/dashboard/shared/MonitoringKbmWidget';
import {
  DistribusiChart,
  SupervisiPanel,
  PerangkatPanel,
  type PerangkatRecentItem,
  type SupervisiRecentItem,
  type ConflictResult,
} from '@/components/kurikulum/dashboard/DashboardComponents';
import type { KurikulumTabId } from '../types';

export interface KurikulumBerandaTabProps {
  semNama: string;
  tpTahun: string;
  totalGuru: number;
  totalKelas: number;
  totalMapel: number;
  totalJpMinggu: number;
  distribusi: { name: string; jp: number }[];
  beban: { nama: string; jp: number }[];
  teachersLoad: { id: string; nama: string; jp: number }[];
  conflicts: ConflictResult[];
  perangkatStats: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    pctCompleteness: number;
    uniqueApprovedTeachersCount: number;
  };
  recentPerangkat: PerangkatRecentItem[];
  supRows: SupervisiRecentItem[];
  supPct: number;
  pieData: { name: string; value: number; color: string }[];
  recentSup: SupervisiRecentItem[];
  loading: boolean;
  onTabSelect: (tabId: KurikulumTabId) => void;
  onOpenTvMode?: () => void;
}

export const KurikulumBerandaTab: React.FC<KurikulumBerandaTabProps> = React.memo(({
  semNama,
  tpTahun,
  totalGuru,
  totalKelas,
  totalMapel,
  totalJpMinggu,
  distribusi,
  teachersLoad,
  conflicts,
  perangkatStats,
  recentPerangkat,
  supRows,
  supPct,
  pieData,
  recentSup,
  loading,
  onTabSelect,
}) => {
  const overload = useMemo(() => teachersLoad.filter((t) => t.jp > 24), [teachersLoad]);
  const underload = useMemo(() => teachersLoad.filter((t) => t.jp < 12), [teachersLoad]);

  const supSelesai = useMemo(
    () => supRows.filter((r) => r.status?.toUpperCase() === 'COMPLETED' || r.status?.toUpperCase() === 'SELESAI').length,
    [supRows]
  );
  const supTerjadwal = useMemo(
    () => supRows.filter((r) => r.status?.toUpperCase() === 'SCHEDULED' || r.status?.toUpperCase() === 'TERJADWAL').length,
    [supRows]
  );
  const supBelum = Math.max(0, supRows.length - supSelesai - supTerjadwal);

  // 1. Bento Grid 2x2 Metrik Utama (Shopee-Grade Hairline Dividers)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'semester',
        title: 'Semester Aktif',
        value: semNama || '—',
        subtext: tpTahun ? `TP ${tpTahun}` : 'Tahun Pelajaran',
        icon: CalendarDays,
        iconColorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
        onClick: () => onTabSelect('struktur'),
      },
      {
        id: 'guru',
        title: 'Guru Pendidik',
        value: totalGuru > 0 ? `${totalGuru} Pendidik` : '—',
        subtext: overload.length > 0 ? `${overload.length} Overload JP` : 'Alokasi Optimal',
        icon: Users,
        iconColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
        badge: overload.length > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
            {overload.length}
          </span>
        ) : undefined,
        onClick: () => onTabSelect('guru_mapel'),
      },
      {
        id: 'kelas',
        title: 'Rombongan Belajar',
        value: totalKelas > 0 ? `${totalKelas} Rombel` : '—',
        subtext: 'Rombel Aktif Mengajar',
        icon: LayoutGrid,
        iconColorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
        onClick: () => onTabSelect('jadwal'),
      },
      {
        id: 'mapel',
        title: 'Mata Pelajaran',
        value: totalMapel > 0 ? `${totalMapel} Mapel` : '—',
        subtext: totalJpMinggu > 0 ? `${totalJpMinggu} JP / Minggu` : 'Struktur Kurikulum',
        icon: BookOpen,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        onClick: () => onTabSelect('struktur'),
      },
    ],
    [semNama, tpTahun, totalGuru, overload.length, totalKelas, totalMapel, totalJpMinggu, onTabSelect]
  );

  // 2. Pintasan Aksi Operasional (Shopee-Grade Headerless Quick Action Slider)
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'jadwal',
        label: 'Jadwal KBM',
        icon: Calendar,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        badge: conflicts.length > 0 ? conflicts.length : undefined,
        onClick: () => onTabSelect('jadwal'),
      },
      {
        id: 'guru_mapel',
        label: 'Plotting Guru',
        icon: Users,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        badge: overload.length > 0 ? overload.length : undefined,
        onClick: () => onTabSelect('guru_mapel'),
      },
      {
        id: 'struktur',
        label: 'Struktur Mapel',
        icon: Layers,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onTabSelect('struktur'),
      },
      {
        id: 'piket',
        label: 'Jadwal Piket',
        icon: Clock,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onTabSelect('piket'),
      },
      {
        id: 'perangkat',
        label: 'Perangkat Ajar',
        icon: FileText,
        iconColorClass: 'text-teal-600 dark:text-teal-400',
        badge: perangkatStats.pending > 0 ? perangkatStats.pending : undefined,
        onClick: () => onTabSelect('perangkat'),
      },
      {
        id: 'supervisi',
        label: 'Supervisi Guru',
        icon: CheckCircle2,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        badge: supBelum > 0 ? supBelum : undefined,
        onClick: () => onTabSelect('supervisi'),
      },
      {
        id: 'rapor',
        label: 'Pleno Rapor',
        icon: Award,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => onTabSelect('rapor'),
      },
    ],
    [conflicts.length, overload.length, perangkatStats.pending, supBelum, onTabSelect]
  );

  return (
    <div className="space-y-4">
      {/* 1. BENTO GRID 2x2 METRIK UTAMA (Shopee-Grade Hairline Dividers) */}
      <HubCard noPadding>
        <HubBentoGrid cells={bentoCells} columns={2} />
      </HubCard>

      {/* 2. PINTASAN AKSI OPERASIONAL (Shopee-Grade Headerless Quick Action Slider) */}
      <HubCard bodyClassName="py-2.5 sm:py-3 px-2 sm:px-3">
        <HubActionGrid items={actionItems} variant="slider" />
      </HubCard>

      {/* 3. CONFLICT ALERT BANNER (If Conflicts Detected) */}
      {conflicts.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-xs flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                Terdeteksi {conflicts.length} Potensi Bentrok Jadwal KBM
              </h4>
              <button
                type="button"
                onClick={() => onTabSelect('jadwal')}
                className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1 shrink-0"
              >
                Atur Jadwal <ChevronRight size={14} />
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-700/90 dark:text-amber-300/80 mt-1 line-clamp-2">
              Terdapat jadwal mengajar guru atau penggunaan ruangan kelas yang tumpang tindih pada jam pelajaran yang sama.
            </p>
          </div>
        </div>
      )}

      {/* 4. LIVE MONITORING KBM WIDGET */}
      <div className="w-full">
        <MonitoringKbmWidget isExecutive={true} />
      </div>

      {/* 5. ANALYTICS ROW: DISTRIBUSI BEBAN JP & BEBAN GURU */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribusi JP */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Distribusi Alokasi Jam Mengajar
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Beban JP KBM per jurusan dan tingkat rombel
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTabSelect('struktur')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Struktur <ChevronRight size={14} />
            </button>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <DistribusiChart data={distribusi} loading={loading} />
          </div>
        </div>

        {/* Status Beban Mengajar Guru (Overload / Underload) */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Keseimbangan Beban Pendidik
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Standar Permendikbud: 12 - 24 Jam Pelajaran / Minggu
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTabSelect('guru_mapel')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Lihat Semua <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                Beban Lebih (&gt;24 JP)
              </span>
              <div className="text-lg font-black text-rose-700 dark:text-rose-300 mt-0.5">
                {overload.length} Guru
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                Beban Kurang (&lt;12 JP)
              </span>
              <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                {underload.length} Guru
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {teachersLoad.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                  {t.nama}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold",
                    t.jp > 24
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                      : t.jp < 12
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                  )}
                >
                  {t.jp} JP / mg
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. PERANGKAT AJAR & SUPERVISI PREVIEW PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PerangkatPanel
          stats={perangkatStats}
          recent={recentPerangkat}
          loading={loading}
          teachersCount={totalGuru}
        />
        <SupervisiPanel
          pct={supPct}
          pieData={pieData}
          selesai={supSelesai}
          terjadwal={supTerjadwal}
          belum={supBelum}
          total={supRows.length}
          recent={recentSup}
          loading={loading}
          hasPermission={true}
        />
      </div>
    </div>
  );
});

KurikulumBerandaTab.displayName = 'KurikulumBerandaTab';
