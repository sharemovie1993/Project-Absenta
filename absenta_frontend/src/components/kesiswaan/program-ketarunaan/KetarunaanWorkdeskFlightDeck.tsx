import React, { useMemo } from 'react';
import {
  Layers,
  Users,
  LayoutList,
  FileText,
  Medal,
  Activity,
  Lock,
  Check,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export type KetarunaanWorkflowStepId =
  | 'kepanitiaan'
  | 'laporan_kelas'
  | 'laporan_tim'
  | 'penilaian'
  | 'statistik';

export interface KetarunaanWorkdeskFlightDeckProps {
  activeStep: KetarunaanWorkflowStepId;
  onSelectStep: (step: KetarunaanWorkflowStepId) => void;
  guard?: {
    is_active?: boolean;
    jadwal_nama?: string | null;
    jadwal_waktu_mulai?: string | null;
    jadwal_waktu_selesai?: string | null;
    is_today_scheduled_day?: boolean;
    is_within_time_window?: boolean;
  } | null;
  hariAktifLabel?: string | null;
  sesiId?: string | null;
  stats?: any;
  totalKelasCount?: number;
  selectedTahunPelajaranNama?: string;
  selectedSemesterNama?: string;
  selectedKelasLabel?: string;
  onOpenSettings?: () => void;
  onOpenStaging?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  filterToolbarNode?: React.ReactNode;
}

function formatWaktu(w?: string | null) {
  if (!w) return '-';
  return w.length === 5 ? w : w.slice(0, 5);
}

export const KetarunaanWorkdeskFlightDeck: React.FC<KetarunaanWorkdeskFlightDeckProps> = React.memo(({
  activeStep,
  onSelectStep,
  guard,
  hariAktifLabel,
  sesiId,
  stats,
  totalKelasCount = 36,
  selectedTahunPelajaranNama,
  selectedSemesterNama,
  selectedKelasLabel,
  onOpenSettings,
  onOpenStaging,
  onRefresh,
  isRefreshing = false,
  filterToolbarNode,
}) => {
  const ringkasan = stats?.ringkasan_periode;
  const summaryTerkini = stats?.latest;
  const totalPertemuan = stats?.trend?.length ?? ringkasan?.total_sesi ?? 0;

  const avgPersenSiswa =
    ringkasan && ringkasan.total_sesi > 0
      ? ringkasan.avg_persen_siswa
      : summaryTerkini?.persen_hadir_siswa ?? null;

  const avgPersenGuru =
    ringkasan && ringkasan.total_sesi > 0
      ? ringkasan.avg_persen_guru
      : summaryTerkini?.persen_hadir_pendamping ?? null;

  const shortKelasLabel = useMemo(() => {
    if (!selectedKelasLabel) return '4 Pilar';
    return selectedKelasLabel.split(' - ')[0].trim() || '4 Pilar';
  }, [selectedKelasLabel]);

  const steps: Array<{
    id: KetarunaanWorkflowStepId;
    title: string;
    badgeLabel: string;
    detailText: string;
    icon: React.ElementType;
    isDone: boolean;
    hasWarning: boolean;
  }> = useMemo(
    () => [
      {
        id: 'kepanitiaan',
        title: 'Pos & Presensi',
        badgeLabel: !guard?.is_active
          ? 'Agenda Off'
          : sesiId
          ? 'Sesi Aktif'
          : 'Siaga POS',
        detailText: 'Tahap 1: Terminal Presensi Lapangan & Pembagian Pos Tim Pendamping',
        icon: Users,
        isDone: Boolean(guard?.is_active),
        hasWarning: !guard?.is_active,
      },
      {
        id: 'laporan_kelas',
        title: 'Rekap Rombel',
        badgeLabel:
          avgPersenSiswa !== null
            ? `${avgPersenSiswa}% Hadir`
            : `${totalKelasCount} Rombel`,
        detailText: 'Tahap 2: Kontrol Kehadiran & Ketertiban Taruna per Rombel',
        icon: LayoutList,
        isDone: totalPertemuan > 0,
        hasWarning: false,
      },
      {
        id: 'laporan_tim',
        title: 'Pembina & Walas',
        badgeLabel:
          avgPersenGuru !== null ? `${avgPersenGuru}% Patuh` : 'Tim Pembina',
        detailText: 'Tahap 3: Audit Kepatuhan Kehadiran Tim Pembina & Wali Kelas Pendamping',
        icon: FileText,
        isDone: Boolean(avgPersenGuru !== null && avgPersenGuru > 0),
        hasWarning: false,
      },
      {
        id: 'penilaian',
        title: 'Nilai & Sertifikat',
        badgeLabel: shortKelasLabel,
        detailText:
          'Tahap 4: Lembar Input Nilai 4 Pilar Ketarunaan, Kunci ke Rapor Kokurikuler & Cetak Sertifikat',
        icon: Medal,
        isDone: Boolean(selectedKelasLabel),
        hasWarning: false,
      },
      {
        id: 'statistik',
        title: 'Monitoring',
        badgeLabel: `${totalPertemuan} Sesi`,
        detailText: 'Tahap 5: Evaluasi Performa, Statistik & Tren Perkembangan Disiplin Taruna',
        icon: Activity,
        isDone: totalPertemuan > 0,
        hasWarning: false,
      },
    ],
    [
      guard?.is_active,
      sesiId,
      avgPersenSiswa,
      totalKelasCount,
      totalPertemuan,
      avgPersenGuru,
      shortKelasLabel,
      selectedKelasLabel,
    ]
  );

  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === activeStep)
  );
  const fillPercent = activeIndex === 4 ? 100 : activeIndex * 20 + 10;

  const contextLabel = useMemo(() => {
    const agendaName = guard?.jadwal_nama || 'Program Ketarunaan & Kesamaptaan';
    const tpPart = selectedTahunPelajaranNama ? ` • TP ${selectedTahunPelajaranNama}` : '';
    const semPart = selectedSemesterNama ? ` ${selectedSemesterNama}` : '';
    return `${agendaName}${tpPart}${semPart}`;
  }, [guard?.jadwal_nama, selectedTahunPelajaranNama, selectedSemesterNama]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
      <div className="p-2.5 sm:p-3.5 space-y-2">
        {/* ── Row 1: Header Meja Kerja Ketarunaan (Ramping & Padat) ── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Title + Active Event/Program Scope Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-600/30 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 shrink-0">
              <Layers size={14} />
            </span>
            <h2 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white shrink-0">
              Meja Kerja Ketarunaan
            </h2>

            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-200 text-[11px] font-bold cursor-pointer transition-colors"
              title="Konteks Agenda & Periode Ketarunaan Aktif"
            >
              <Lock size={11} className="text-indigo-500 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-md font-bold">{contextLabel}</span>
            </button>

            {guard?.jadwal_waktu_mulai && (
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>
                  {hariAktifLabel ? `${hariAktifLabel} • ` : ''}
                  {formatWaktu(guard.jadwal_waktu_mulai)}–{formatWaktu(guard.jadwal_waktu_selesai)} WIB
                </span>
              </span>
            )}

            {!guard?.is_active ? (
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                Agenda Nonaktif
              </Badge>
            ) : guard?.is_today_scheduled_day && guard?.is_within_time_window ? (
              <Badge variant="success" className="text-[10px] animate-pulse">
                ● Sesi Berlangsung
              </Badge>
            ) : guard?.is_today_scheduled_day ? (
              <Badge variant="info" className="text-[10px]">
                Hari Pelaksanaan
              </Badge>
            ) : null}
          </div>

          {/* Right: Shortcut Staging Presensi, Pengaturan & Refresh */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs flex-wrap">
            {onOpenStaging && (
              <button
                type="button"
                onClick={onOpenStaging}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Buka Wadah Penampung Presensi (Attendance Staging Hub)"
              >
                <FileSpreadsheet size={12} className="text-emerald-100 shrink-0" />
                <span>Staging Presensi</span>
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Segarkan Data Meja Kerja"
              >
                <RefreshCw size={12} className={cn(isRefreshing && 'animate-spin')} />
                <span className="hidden sm:inline">Segarkan</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Buka Pengaturan Jadwal & Agenda Ketarunaan"
              >
                <SlidersHorizontal size={12} className="text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Pengaturan</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Row 2: Stepper Garis Lingkaran Horizontal 5 Tahap (Compact) ───── */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="relative pt-0.5">
            {/* Horizontal Track Line Container */}
            <div className="absolute top-[14px] sm:top-[16px] left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700/80 rounded-full z-0 overflow-hidden">
              {/* Active Progress Fill Line */}
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${fillPercent}%` }}
              />
            </div>

            {/* 5 Circles and Labels Grid */}
            <div className="grid grid-cols-5 relative z-10">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onSelectStep(step.id)}
                    className="group flex flex-col items-center focus:outline-hidden cursor-pointer"
                    title={step.detailText}
                  >
                    {/* Circle Node with micro check / warning badge */}
                    <div className="relative">
                      <div
                        className={cn(
                          'w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xs',
                          isActive
                            ? 'bg-indigo-600 text-white ring-3 ring-indigo-100 dark:ring-indigo-950/80 scale-105'
                            : step.isDone
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                            : step.hasWarning
                            ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                        )}
                      >
                        <Icon size={14} className="transition-transform group-hover:scale-110" />
                      </div>

                      {/* Micro completion or warning badge at top-right */}
                      {step.isDone ? (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border border-white dark:border-slate-900"
                          title="Siap / Aktif"
                        >
                          <Check size={8} strokeWidth={3} />
                        </span>
                      ) : step.hasWarning ? (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs border border-white dark:border-slate-900"
                          title="Perlu Perhatian"
                        >
                          <AlertCircle size={8} strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>

                    {/* Label & Dynamic Readiness Subtitle */}
                    <div className="mt-1 flex flex-col items-center leading-tight">
                      <span
                        className={cn(
                          'text-[10px] sm:text-xs transition-colors whitespace-nowrap text-center font-bold',
                          isActive
                            ? 'text-indigo-600 dark:text-indigo-400 font-black'
                            : step.isDone
                            ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                            : step.hasWarning
                            ? 'text-rose-600 dark:text-rose-400 font-black'
                            : 'font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        )}
                      >
                        {step.title}
                      </span>
                      <span
                        className={cn(
                          'text-[9px] px-1.5 py-0.2 rounded-md font-bold mt-0.5 whitespace-nowrap transition-all',
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800'
                            : step.isDone
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800'
                            : step.hasWarning
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        )}
                      >
                        {step.badgeLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Integrated Academic Filter Toolbar (Desktop Only if Mobile uses Topbar Toggle) ──── */}
      {filterToolbarNode && (
        <div className="hidden lg:block px-3.5 py-2 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80">
          {filterToolbarNode}
        </div>
      )}
    </div>
  );
});

KetarunaanWorkdeskFlightDeck.displayName = 'KetarunaanWorkdeskFlightDeck';
