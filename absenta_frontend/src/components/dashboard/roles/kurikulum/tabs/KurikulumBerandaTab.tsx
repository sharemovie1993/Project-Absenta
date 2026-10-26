import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TrendingUp,
  Activity,
  Tv,
  ArrowRight,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonitoringKbmWidget } from '@/components/dashboard/shared/MonitoringKbmWidget';
import {
  DistribusiChart,
  SupervisiPanel,
  PerangkatPanel,
  PALETTE,
  type PerangkatRecentItem,
  type SupervisiRecentItem,
  type ConflictResult,
} from '@/components/kurikulum/dashboard/DashboardComponents';
import type { KurikulumTabId, KurikulumQuickAction } from '../types';

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

export const KurikulumBerandaTab: React.FC<KurikulumBerandaTabProps> = ({
  semNama,
  tpTahun,
  totalGuru,
  totalKelas,
  totalMapel,
  totalJpMinggu,
  distribusi,
  beban,
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
  onOpenTvMode,
}) => {
  const navigate = useNavigate();
  const [sliderIndex, setSliderIndex] = useState(0);

  const overload = teachersLoad.filter((t) => t.jp > 24);
  const underload = teachersLoad.filter((t) => t.jp < 12);

  const quickActions: KurikulumQuickAction[] = [
    {
      id: 'jadwal',
      title: 'Jadwal KBM',
      subtitle: 'Plotting & Jam KBM',
      icon: Calendar,
      color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
      tabTarget: 'jadwal',
    },
    {
      id: 'guru_mapel',
      title: 'Plotting Guru',
      subtitle: `${totalGuru} Pendidik`,
      icon: Users,
      color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-blue-500/20',
      tabTarget: 'guru_mapel',
    },
    {
      id: 'struktur',
      title: 'Struktur Kurikulum',
      subtitle: `${totalMapel} Mata Pelajaran`,
      icon: Layers,
      color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20',
      tabTarget: 'struktur',
    },
    {
      id: 'piket',
      title: 'Jadwal Piket',
      subtitle: 'Tugas Harian Guru',
      icon: Clock,
      color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-amber-500/20',
      tabTarget: 'piket',
    },
    {
      id: 'perangkat',
      title: 'Perangkat Ajar',
      subtitle: `${perangkatStats.pctCompleteness}% Lengkap`,
      icon: FileText,
      color: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 ring-teal-500/20',
      tabTarget: 'perangkat',
      badge: perangkatStats.pending > 0 ? `${perangkatStats.pending} Menunggu` : undefined,
    },
    {
      id: 'supervisi',
      title: 'Supervisi Guru',
      subtitle: `${supPct}% Selesai`,
      icon: CheckCircle2,
      color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 ring-purple-500/20',
      tabTarget: 'supervisi',
    },
    {
      id: 'rapor',
      title: 'Pleno Rapor',
      subtitle: 'Monitoring Nilai',
      icon: Award,
      color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 ring-rose-500/20',
      tabTarget: 'rapor',
    },
  ];

  const metricsData = [
    {
      label: 'Semester Aktif',
      value: semNama || '—',
      sub: tpTahun ? `TP ${tpTahun}` : 'Tahun Pelajaran',
      icon: CalendarDays,
      color: 'teal',
      onClick: () => onTabSelect('struktur'),
    },
    {
      label: 'Guru Pendidik',
      value: totalGuru > 0 ? `${totalGuru}` : '—',
      sub: `${overload.length > 0 ? `${overload.length} overload` : 'Alokasi optimal'}`,
      icon: Users,
      color: 'blue',
      onClick: () => onTabSelect('guru_mapel'),
    },
    {
      label: 'Rombongan Belajar',
      value: totalKelas > 0 ? `${totalKelas}` : '—',
      sub: 'Rombel aktif mengajar',
      icon: LayoutGrid,
      color: 'purple',
      onClick: () => onTabSelect('jadwal'),
    },
    {
      label: 'Mata Pelajaran',
      value: totalMapel > 0 ? `${totalMapel}` : '—',
      sub: `${totalJpMinggu > 0 ? `${totalJpMinggu} JP/minggu` : 'Struktur kurikulum'}`,
      icon: BookOpen,
      color: 'amber',
      onClick: () => onTabSelect('struktur'),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. HERO BENTO METRIC CARDS (2x2 Mobile, 4x1 Desktop) */}
      <div className="w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-3 sm:p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800/80">
          {metricsData.map((m, idx) => {
            const Icon = m.icon;
            const colorStyles: Record<string, { bg: string; text: string; ring: string }> = {
              teal: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-500/20' },
              blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/20' },
              purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/20' },
              amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' },
            };
            const style = colorStyles[m.color] || colorStyles.teal;

            return (
              <button
                type="button"
                key={idx}
                onClick={m.onClick}
                className={cn(
                  "text-left flex flex-col justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all group hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer",
                  idx % 2 === 1 && "sm:pt-3",
                  idx >= 2 && "pt-2.5 sm:pt-3"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                    {m.label}
                  </span>
                  <div className={cn("p-1.5 sm:p-2 rounded-lg sm:rounded-xl ring-1 transition-transform group-hover:scale-105", style.bg, style.text, style.ring)}>
                    <Icon size={15} />
                  </div>
                </div>

                <div>
                  <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {m.value}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate font-medium">
                    {m.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SHOPEE-GRADE QUICK ACTION SLIDER */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Pusat Tindakan Kurikulum
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200/50 dark:border-emerald-800/40">
              Cepat & Presisi
            </span>
          </div>
          {onOpenTvMode && (
            <button
              type="button"
              onClick={onOpenTvMode}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <Tv size={14} />
              <span className="hidden sm:inline">Mode TV Display</span>
            </button>
          )}
        </div>

        {/* Horizontal Slider Scrollable */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                type="button"
                key={action.id}
                onClick={() => {
                  if (action.tabTarget) onTabSelect(action.tabTarget);
                  if (action.onClick) action.onClick();
                }}
                className="group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all shrink-0 w-[84px] sm:w-[104px] text-center"
              >
                {action.badge && (
                  <span className="absolute -top-1.5 right-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500 text-white shadow-xs">
                    {action.badge}
                  </span>
                )}
                <div className={cn("p-2 sm:p-2.5 rounded-xl ring-1 mb-1.5 transition-transform group-hover:scale-110", action.color)}>
                  <Icon size={18} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {action.title}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5 font-medium">
                  {action.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
          selesai={supRows.filter(r => r.status?.toUpperCase() === 'COMPLETED' || r.status?.toUpperCase() === 'SELESAI').length}
          terjadwal={supRows.filter(r => r.status?.toUpperCase() === 'SCHEDULED' || r.status?.toUpperCase() === 'TERJADWAL').length}
          belum={Math.max(0, supRows.length - (supRows.filter(r => r.status?.toUpperCase() === 'COMPLETED' || r.status?.toUpperCase() === 'SELESAI').length) - (supRows.filter(r => r.status?.toUpperCase() === 'SCHEDULED' || r.status?.toUpperCase() === 'TERJADWAL').length))}
          total={supRows.length}
          recent={recentSup}
          loading={loading}
          hasPermission={true}
        />
      </div>
    </div>
  );
};
