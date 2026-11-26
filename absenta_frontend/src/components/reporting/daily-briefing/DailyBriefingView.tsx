/**
 * DailyBriefingView.tsx
 * Universal Role-Ready View (DRY) untuk Laporan Harian Eksekutif Sekolah.
 *
 * Skenario Penggunaan:
 * 1. Public Read-Only Page via Token (/reports/daily-briefing?token=...)
 * 2. Embedded Tab di Dashboard Kepala Sekolah atau Admin (hideLayout=true)
 * 3. Quick-Access Modal Dialog (isModal=true)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap,
  UserCheck,
  BookOpen,
  Clock,
  Briefcase,
  Printer,
  RefreshCw,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  HeartHandshake,
  CheckCircle2,
  Copy,
  TrendingUp,
  TrendingDown,
  Activity,
  Share2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getDailyBriefingByToken,
  type UniversalBriefingData,
  type BriefingMetricItem,
  type BriefingSection,
} from '@/api/dailyBriefing.api';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui';
import { toast } from 'sonner';

export interface UniversalDailyBriefingViewProps {
  token?: string;
  initialData?: UniversalBriefingData;
  isModal?: boolean;
  hideLayout?: boolean;
  onClose?: () => void;
}

export const DailyBriefingView: React.FC<UniversalDailyBriefingViewProps> = React.memo(({
  token,
  initialData,
  isModal = false,
  hideLayout = false,
  onClose,
}) => {
  // Query data jika token disediakan dan data awal belum ada
  const {
    data: queryData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<UniversalBriefingData>({
    queryKey: ['daily-briefing', token],
    queryFn: () => getDailyBriefingByToken(token!),
    enabled: Boolean(token && !initialData),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const briefing = initialData || queryData;

  // State Accordion untuk tiap seksi divisi (default terbuka semua untuk kemudahan Kepsek)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    early_warning: true,
    kesiswaan: true,
    kurikulum: true,
    cbt_kurikulum: true,
    penilaian_rapor: true,
    bpbk: true,
    hubin_pkl: true,
  });

  const [copied, setCopied] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Salin Ringkasan Eksekutif ke Clipboard
  const handleCopySummary = async () => {
    if (!briefing) return;
    try {
      const lines: string[] = [];
      lines.push(`*LAPORAN EKSEKUTIF HARIAN - ${briefing.sekolahNama.toUpperCase()}*`);
      lines.push(`📅 ${briefing.tanggalStr}`);
      if (briefing.statusBadge) {
        lines.push(`🚦 Status Operasional: *${briefing.statusBadge.label}* (Indeks: ${briefing.statusBadge.score}%)`);
      }
      lines.push(``);
      lines.push(`📊 *RINGKASAN UTAMA:*`);
      for (const m of briefing.metrics) {
        lines.push(`• ${m.label}: *${m.value}* ${m.sub ? `(${m.sub})` : ''}`);
      }
      if (briefing.highlights && briefing.highlights.length > 0) {
        lines.push(``);
        lines.push(`⚡ *POIN-POIN KRITIS HARI INI:*`);
        for (const h of briefing.highlights) {
          lines.push(`• ${h}`);
        }
      }
      lines.push(``);
      lines.push(`_Digenerate via Absenta System - ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB_`);

      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      toast.success('Ringkasan eksekutif berhasil disalin ke clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Gagal menyalin ringkasan ke clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-6">
        <Loader size="lg" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 animate-pulse">
          Memuat Laporan Harian Eksekutif...
        </p>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Laporan Tidak Dapat Diakses
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          {(error as any)?.response?.data?.message ||
            (error as Error)?.message ||
            'Tautan laporan telah kedaluwarsa atau token tidak valid. Silakan hubungi admin sekolah untuk mendapatkan tautan baru.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  const renderMetricIcon = (iconName?: string) => {
    switch (iconName) {
      case 'GraduationCap':
        return <GraduationCap className="w-5 h-5" />;
      case 'UserCheck':
        return <UserCheck className="w-5 h-5" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5" />;
      case 'Clock':
        return <Clock className="w-5 h-5" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5" />;
      default:
        return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  const statusBadgeConfig = briefing.statusBadge
    ? {
        success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        danger: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      }[briefing.statusBadge.variant]
    : null;

  return (
    <div
      className={cn(
        'w-full max-w-4xl mx-auto space-y-6 print:space-y-4 print:max-w-none print:m-0 print:p-0',
        hideLayout ? 'p-0' : 'p-3 sm:p-6 pb-20'
      )}
    >
      {/* ── 1. HEADER UTAMA LAPORAN EKSEKUTIF ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-5 sm:p-7 shadow-xl border border-indigo-800/40 print:bg-none print:text-black print:border-b-2 print:border-black print:rounded-none print:p-2 print:shadow-none">
        {/* Background Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none print:hidden" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none print:hidden" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner print:border-black print:text-black">
              <Building2 className="w-6 h-6 text-indigo-300 print:text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 print:border-black print:text-black">
                  Laporan Resmi Terverifikasi
                </span>
                {briefing.statusBadge && (
                  <span
                    className={cn(
                      'text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 print:border-black print:text-black',
                      statusBadgeConfig
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {briefing.statusBadge.label} ({briefing.statusBadge.score}%)
                  </span>
                )}
                <span className="text-[10px] text-indigo-200/80 flex items-center gap-1 print:text-black">
                  <Calendar className="w-3 h-3" />
                  {briefing.tanggalStr}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 print:text-black">
                {briefing.title}
              </h1>
              <p className="text-xs text-indigo-200/90 font-medium print:text-black">
                {briefing.sekolahNama} • Penerima: <strong className="text-white print:text-black">{briefing.targetName}</strong> ({briefing.roleLabel})
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 print:hidden flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md rounded-xl text-xs h-9 px-3"
              title="Salin ringkasan ke format teks WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copied ? 'Tersalin' : 'Salin Ringkasan'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md rounded-xl text-xs h-9 px-3"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Cetak / PDF
            </Button>

            {token && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md rounded-xl text-xs h-9 px-3"
              >
                <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isRefetching && 'animate-spin')} />
                Segarkan
              </Button>
            )}

            {isModal && onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/10 rounded-xl text-xs h-9 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. 30-SECOND EXECUTIVE SNAPSHOT (HIGHLIGHTS) ── */}
      {briefing.highlights && briefing.highlights.length > 0 && (
        <div className="rounded-2xl p-4 sm:p-5 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 shadow-xs print:border-black print:bg-none">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Ringkasan Kondisi Sekolah Hari Ini (30-Second Snapshot)
              </h3>
            </div>
            {briefing.trend?.kehadiranDeltaPct !== null && (
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0',
                  (briefing.trend?.kehadiranDeltaPct || 0) >= 0
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                )}
              >
                {(briefing.trend?.kehadiranDeltaPct || 0) >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {(briefing.trend?.kehadiranDeltaPct || 0) >= 0 ? '+' : ''}
                {briefing.trend?.kehadiranDeltaPct}% vs kemarin
              </span>
            )}
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {briefing.highlights.map((h, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 3. BENTO GRID METRICS UTAMA ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 print:grid-cols-4">
        {briefing.metrics.map((m: BriefingMetricItem) => {
          const statusColors = {
            success: 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
            warning: 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
            danger: 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400',
            info: 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400',
          };

          const colorClass = statusColors[m.status || 'info'];

          return (
            <div
              key={m.id}
              className={cn(
                'rounded-2xl p-4 border shadow-xs transition-all flex flex-col justify-between print:border-black print:bg-none',
                colorClass
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                  {m.label}
                </span>
                <span className="p-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
                  {renderMetricIcon(m.icon)}
                </span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {m.value}
                </p>
                {m.sub && (
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {m.sub}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 4. SECTIONS PER DIVISI (DEEP DIVE ACCORDION) ── */}
      <div className="space-y-4">
        {briefing.sections.map((sec: BriefingSection) => {
          const isOpen = openSections[sec.id] ?? true;
          const isEarlyWarning = sec.id === 'early_warning';

          return (
            <div
              key={sec.id}
              className={cn(
                'rounded-2xl bg-white dark:bg-slate-900 border shadow-sm overflow-hidden print:border-black print:shadow-none transition-all',
                isEarlyWarning
                  ? 'border-rose-300 dark:border-rose-900/60 shadow-rose-500/5'
                  : 'border-slate-200 dark:border-slate-800'
              )}
            >
              {/* Section Header Accordion Trigger */}
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className={cn(
                  'w-full flex items-center justify-between p-4 sm:p-5 text-left transition-colors select-none print:cursor-default',
                  isEarlyWarning
                    ? 'bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-xl shrink-0',
                      isEarlyWarning
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    )}
                  >
                    {isEarlyWarning ? <AlertTriangle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {sec.title}
                      </h4>
                      {sec.badge && (
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            isEarlyWarning
                              ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/50'
                          )}
                        >
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {sec.summary}
                    </p>
                  </div>
                </div>

                <div className="text-slate-400 print:hidden ml-2">
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Section Content */}
              {isOpen && (
                <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800/60">
                  {/* Stats Grid Chips */}
                  {sec.stats && sec.stats.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-3">
                      {sec.stats.map((st, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center"
                        >
                          <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold block truncate">
                            {st.label}
                          </span>
                          <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                            {st.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress Bars per Divisi */}
                  {sec.progressBars && sec.progressBars.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {sec.progressBars.map((pb, pIdx) => {
                        const pct = Math.max(0, Math.min(100, Math.round(pb.value)));
                        const barColor =
                          pb.color === 'emerald'
                            ? 'bg-emerald-500'
                            : pb.color === 'blue'
                            ? 'bg-blue-500'
                            : pb.color === 'amber'
                            ? 'bg-amber-500'
                            : pb.color === 'rose'
                            ? 'bg-rose-500'
                            : 'bg-indigo-500';
                        return (
                          <div
                            key={pIdx}
                            className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                {pb.label}
                              </span>
                              <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">
                                {pct}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all duration-500', barColor)}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {pb.detail && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                {pb.detail}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* List Items (Catatan Kasus / Siswa Perhatian / Rombel Prestasi) */}
                  {sec.items && sec.items.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Rincian Butir &amp; Tindak Lanjut:
                      </span>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 overflow-hidden">
                        {sec.items.map((item, itmIdx) => (
                          <div
                            key={itmIdx}
                            className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <div className="space-y-1 min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {item.subtitle}
                                </p>
                              )}
                              {item.note && (
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 italic bg-white/60 dark:bg-slate-900/40 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-800/50">
                                  💡 {item.note}
                                </p>
                              )}
                            </div>
                            {item.badge && (
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 self-start sm:self-center',
                                  item.badgeColor || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state bila tidak ada rincian kendala */}
                  {(!sec.stats || sec.stats.length === 0) && (!sec.items || sec.items.length === 0) && (
                    <div className="py-4 text-center rounded-xl bg-slate-50/60 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      ✨ Situasi operasional divisi terpantau kondusif. Tidak ada catatan kasus darurat hari ini.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 5. FOOTER RESMI & MASA BERLAKU ── */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-500 dark:text-slate-400 space-y-1 print:border-none print:bg-none">
        <p>
          Dokumen ini digenerate secara otomatis oleh <strong>Absenta Universal Daily Briefing Engine</strong> pada pukul 19:00 WIB.
        </p>
        <p className="text-[10px] text-slate-400">
          Tautan publik ini bersifat aman (Read-Only) dan berlaku hingga <strong>{new Date(briefing.expiresAt).toLocaleString('id-ID')}</strong>.
        </p>
      </div>
    </div>
  );
});

DailyBriefingView.displayName = 'DailyBriefingView';

export default DailyBriefingView;
