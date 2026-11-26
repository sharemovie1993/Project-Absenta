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
  Trophy,
  Camera,
  Sparkles,
  Award,
  Target,
} from 'lucide-react';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';
import {
  getDailyBriefingByToken,
  type UniversalBriefingData,
  type BriefingMetricItem,
  type BriefingSection,
  type BriefingKbmGalleryItem,
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
    perangkat_ajar: true,
    adopsi_platform: true,
    cbt_kurikulum: true,
    penilaian_rapor: true,
    bpbk: true,
    ketarunaan: true,
    hubin_pkl: true,
  });

  const [copied, setCopied] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<BriefingKbmGalleryItem | null>(null);
  const [leaderboardScope, setLeaderboardScope] = useState<'today' | 'range'>('today');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleAllSections = (open: boolean) => {
    if (!briefing) return;
    const next: Record<string, boolean> = {};
    for (const s of briefing.sections) {
      next[s.id] = open;
    }
    setOpenSections(next);
  };

  const jumpToSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      const el = document.getElementById(`briefing-sec-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
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
      if (briefing.aiVerdict) {
        lines.push(`🏆 Gelar AI Sekolah: *${briefing.aiVerdict.schoolTitle}* (Skor ${briefing.aiVerdict.overallScore}/100 • Grade ${briefing.aiVerdict.grade})`);
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

      {/* ── 2b. VONIS & GELAR AI EKSEKUTIF SEKOLAH (MULTI-DIVISI HOLISTIC INTELLIGENCE) ── */}
      {briefing.aiVerdict && (
        <div
          className={cn(
            'rounded-2xl border p-4 sm:p-6 shadow-sm transition-all print:border-black print:shadow-none',
            briefing.aiVerdict.variant === 'emerald'
              ? 'bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 border-emerald-300/80 dark:border-emerald-800/70'
              : briefing.aiVerdict.variant === 'indigo'
              ? 'bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/60 dark:from-indigo-950/30 dark:via-slate-900 dark:to-blue-950/20 border-indigo-300/80 dark:border-indigo-800/70'
              : briefing.aiVerdict.variant === 'amber'
              ? 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20 border-amber-300/80 dark:border-amber-800/70'
              : 'bg-gradient-to-br from-rose-50/90 via-white to-red-50/60 dark:from-rose-950/30 dark:via-slate-900 dark:to-red-950/20 border-rose-300/80 dark:border-rose-800/70'
          )}
        >
          {/* Top Header: AI Badge + Gelar Sekolah + Grade Gauge */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-600 text-white shadow-2xs">
                  <Sparkles className="w-3 h-3" />
                  AI Executive Verdict &amp; Gelar Sekolah
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Sintesis SSOT Lintas Divisi
                </span>
              </div>
              <div className="flex items-start gap-2.5 pt-0.5">
                <Award
                  className={cn(
                    'w-6 h-6 shrink-0 mt-0.5',
                    briefing.aiVerdict.variant === 'emerald'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : briefing.aiVerdict.variant === 'indigo'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : briefing.aiVerdict.variant === 'amber'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                    &ldquo;{briefing.aiVerdict.schoolTitle}&rdquo;
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {briefing.aiVerdict.tagline}
                  </p>
                </div>
              </div>
            </div>

            {/* Overall Score & Grade Badge */}
            <div className="flex items-center gap-3 self-start md:self-center shrink-0 bg-white/90 dark:bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Skor Holistik AI
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {briefing.aiVerdict.overallScore}
                  <span className="text-xs font-semibold text-slate-400">/100</span>
                </span>
              </div>
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-lg border',
                  briefing.aiVerdict.variant === 'emerald'
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : briefing.aiVerdict.variant === 'indigo'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : briefing.aiVerdict.variant === 'amber'
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-rose-600 text-white border-rose-700'
                )}
              >
                <span className="text-[8px] font-bold uppercase leading-none opacity-85">Grade</span>
                <span className="leading-tight">{briefing.aiVerdict.grade}</span>
              </div>
            </div>
          </div>

          {/* Executive Narrative Verdict */}
          <div className="mt-3.5 p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            <span className="font-bold text-indigo-700 dark:text-indigo-400 mr-1.5">
              [Vonis AI]:
            </span>
            {briefing.aiVerdict.executiveVerdict}
          </div>

          {/* 6 Pillars Breakdown Grid */}
          {briefing.aiVerdict.pillars && briefing.aiVerdict.pillars.length > 0 && (
            <div className="mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Rapor Indeks 6 Pilar Penilaian AI:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {briefing.aiVerdict.pillars.map((pillar) => {
                  const pColor =
                    pillar.status === 'excellent'
                      ? 'bg-emerald-500'
                      : pillar.status === 'good'
                      ? 'bg-indigo-500'
                      : pillar.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-rose-500';
                  const pBadge =
                    pillar.status === 'excellent'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : pillar.status === 'good'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                      : pillar.status === 'warning'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';

                  return (
                    <div
                      key={pillar.id}
                      className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {pillar.label}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-extrabold px-1.5 py-0.5 rounded border shrink-0',
                              pBadge
                            )}
                          >
                            {pillar.score}/100 ({pillar.grade})
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-1.5">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', pColor)}
                            style={{ width: `${Math.min(100, Math.max(4, pillar.score))}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                        {pillar.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strengths, Weaknesses & Tactical Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
            {/* Kekuatan Utama */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-800/50">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Kekuatan &amp; Prestasi Utama
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                {briefing.aiVerdict.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Titik Kritis / Blindspot */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/50">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Titik Kritis &amp; Ruang Perbaikan
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                {briefing.aiVerdict.weaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rekomendasi Taktis Kepala Sekolah */}
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-800/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                  Rekomendasi Tindakan Pimpinan
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                {briefing.aiVerdict.recommendations.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. BENTO GRID METRICS UTAMA ── */}
      <div
        className={cn(
          'grid gap-3 sm:gap-4',
          briefing.metrics.length === 5
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5'
            : 'grid-cols-2 md:grid-cols-4 print:grid-cols-4'
        )}
      >
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

      {/* ── 3b. QUICK JUMP NAVIGATION PILLS & COLLAPSE/EXPAND ALL ── */}
      {briefing.sections.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5">
              Lompat Divisi:
            </span>
            {briefing.sections.map((sec) => {
              const shortNames: Record<string, string> = {
                early_warning: '🚨 Radar Dini',
                kesiswaan: 'Kesiswaan',
                kurikulum: 'Kurikulum & KBM',
                perangkat_ajar: 'Perangkat Ajar',
                adopsi_platform: 'Adopsi Platform',
                cbt_kurikulum: 'Event CBT',
                penilaian_rapor: 'Rapor & Nilai',
                bpbk: 'BP/BK',
                ketarunaan: 'Ketarunaan',
                hubin_pkl: 'Hubin & PKL',
              };
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => jumpToSection(sec.id)}
                  className={cn(
                    'text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer',
                    sec.id === 'early_warning'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300'
                  )}
                >
                  {shortNames[sec.id] || sec.category || sec.title}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => toggleAllSections(true)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer"
            >
              Buka Semua
            </button>
            <button
              type="button"
              onClick={() => toggleAllSections(false)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Ringkas Semua
            </button>
          </div>
        </div>
      )}

      {/* ── 4. SECTIONS PER DIVISI (DEEP DIVE ACCORDION) ── */}
      <div className="space-y-4">
        {briefing.sections.map((sec: BriefingSection) => {
          const isOpen = openSections[sec.id] ?? true;
          const isEarlyWarning = sec.id === 'early_warning';

          const SECTION_THEME: Record<
            string,
            { icon: React.ReactNode; iconBox: string; badgeClass: string }
          > = {
            early_warning: {
              icon: <AlertTriangle className="w-5 h-5" />,
              iconBox: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
              badgeClass:
                'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
            },
            kesiswaan: {
              icon: <GraduationCap className="w-5 h-5" />,
              iconBox: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              badgeClass:
                'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
            },
            kurikulum: {
              icon: <BookOpen className="w-5 h-5" />,
              iconBox: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
              badgeClass:
                'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
            },
            perangkat_ajar: {
              icon: <FileText className="w-5 h-5" />,
              iconBox: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
              badgeClass:
                'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
            },
            adopsi_platform: {
              icon: <Activity className="w-5 h-5" />,
              iconBox: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
              badgeClass:
                'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
            },
            cbt_kurikulum: {
              icon: <Award className="w-5 h-5" />,
              iconBox: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              badgeClass:
                'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
            },
            penilaian_rapor: {
              icon: <TrendingUp className="w-5 h-5" />,
              iconBox: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
              badgeClass:
                'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
            },
            bpbk: {
              icon: <HeartHandshake className="w-5 h-5" />,
              iconBox: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
              badgeClass:
                'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800',
            },
            ketarunaan: {
              icon: <ShieldCheck className="w-5 h-5" />,
              iconBox: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
              badgeClass:
                'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
            },
            hubin_pkl: {
              icon: <Briefcase className="w-5 h-5" />,
              iconBox: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
              badgeClass:
                'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
            },
          };

          const secTheme = SECTION_THEME[sec.id] || SECTION_THEME.kurikulum;

          return (
            <div
              key={sec.id}
              id={`briefing-sec-${sec.id}`}
              className={cn(
                'rounded-2xl bg-white dark:bg-slate-900 border shadow-sm overflow-hidden print:border-black print:shadow-none transition-all scroll-mt-4',
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
                  <div className={cn('p-2.5 rounded-xl shrink-0', secTheme.iconBox)}>
                    {secTheme.icon}
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
                            secTheme.badgeClass
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
                  {/* 1. Data Operasional Hari Ini (Scope: 1 Hari) */}
                  {sec.todayStats && sec.todayStats.length > 0 && (
                    <div className="pt-3 space-y-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                        📅 Data Operasional Hari Ini (Scope: 1 Hari)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {sec.todayStats.map((st, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-2.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center"
                          >
                            <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block truncate">
                              {st.label}
                            </span>
                            <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                              {st.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Data Rentang & Progres Kumulatif Semester Aktif */}
                  {sec.rangeStats && sec.rangeStats.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
                        📊 Data Rentang &amp; Akumulasi Periode Aktif
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {sec.rangeStats.map((st, sIdx) => (
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
                    </div>
                  )}

                  {/* Legacy Stats Grid Chips (fallback) */}
                  {!sec.todayStats && !sec.rangeStats && sec.stats && sec.stats.length > 0 && (
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

                  {/* Visual Charts (Pie / Donut & Bar Charts) */}
                  {sec.charts && sec.charts.length > 0 && (
                    <div
                      className={`grid grid-cols-1 ${
                        sec.charts.length > 1 ? 'lg:grid-cols-2' : ''
                      } gap-3 pt-1`}
                    >
                      {sec.charts.map((chart, cIdx) => {
                        const COLOR_PALETTE: Record<
                          string,
                          { stroke: string; bg: string; text: string; lightBg: string }
                        > = {
                          emerald: {
                            stroke: '#10b981',
                            bg: 'bg-emerald-500',
                            text: 'text-emerald-700 dark:text-emerald-300',
                            lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
                          },
                          blue: {
                            stroke: '#3b82f6',
                            bg: 'bg-blue-500',
                            text: 'text-blue-700 dark:text-blue-300',
                            lightBg: 'bg-blue-50 dark:bg-blue-950/40',
                          },
                          indigo: {
                            stroke: '#6366f1',
                            bg: 'bg-indigo-500',
                            text: 'text-indigo-700 dark:text-indigo-300',
                            lightBg: 'bg-indigo-50 dark:bg-indigo-950/40',
                          },
                          amber: {
                            stroke: '#f59e0b',
                            bg: 'bg-amber-500',
                            text: 'text-amber-700 dark:text-amber-300',
                            lightBg: 'bg-amber-50 dark:bg-amber-950/40',
                          },
                          rose: {
                            stroke: '#f43f5e',
                            bg: 'bg-rose-500',
                            text: 'text-rose-700 dark:text-rose-300',
                            lightBg: 'bg-rose-50 dark:bg-rose-950/40',
                          },
                          sky: {
                            stroke: '#0ea5e9',
                            bg: 'bg-sky-500',
                            text: 'text-sky-700 dark:text-sky-300',
                            lightBg: 'bg-sky-50 dark:bg-sky-950/40',
                          },
                          violet: {
                            stroke: '#8b5cf6',
                            bg: 'bg-violet-500',
                            text: 'text-violet-700 dark:text-violet-300',
                            lightBg: 'bg-violet-50 dark:bg-violet-950/40',
                          },
                          purple: {
                            stroke: '#a855f7',
                            bg: 'bg-purple-500',
                            text: 'text-purple-700 dark:text-purple-300',
                            lightBg: 'bg-purple-50 dark:bg-purple-950/40',
                          },
                          slate: {
                            stroke: '#94a3b8',
                            bg: 'bg-slate-400',
                            text: 'text-slate-600 dark:text-slate-400',
                            lightBg: 'bg-slate-100 dark:bg-slate-800',
                          },
                        };

                        const totalValue = chart.data.reduce(
                          (acc, item) => acc + Math.max(0, Number(item.value) || 0),
                          0
                        );
                        const maxVal = chart.maxValue
                          ? Math.max(1, chart.maxValue)
                          : Math.max(
                              1,
                              ...chart.data.map((d) => Math.max(0, Number(d.value) || 0))
                            );

                        let cumulativePct = 0;

                        return (
                          <div
                            key={cIdx}
                            className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between"
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                    {chart.type === 'pie' ? 'Grafik Pie / Proporsi' : 'Grafik Bar'}
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                    {chart.title}
                                  </h5>
                                </div>
                                {chart.subtitle && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {chart.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            {chart.type === 'pie' ? (
                              <div className="flex flex-col sm:flex-row items-center gap-4 my-auto py-1">
                                {/* SVG Donut Chart */}
                                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                                  <svg
                                    viewBox="0 0 42 42"
                                    className="w-full h-full -rotate-90 overflow-visible"
                                  >
                                    <circle
                                      cx="21"
                                      cy="21"
                                      r="15.91549430918954"
                                      fill="transparent"
                                      stroke="currentColor"
                                      strokeWidth="5.5"
                                      className="text-slate-200 dark:text-slate-700"
                                    />
                                    {totalValue > 0 &&
                                      chart.data.map((slice, sIdx) => {
                                        const val = Math.max(0, Number(slice.value) || 0);
                                        if (val <= 0) return null;
                                        const pct = (val / totalValue) * 100;
                                        const dashArray = `${pct} ${100 - pct}`;
                                        const dashOffset = -cumulativePct;
                                        cumulativePct += pct;
                                        const palette =
                                          COLOR_PALETTE[slice.color || 'indigo'] ||
                                          COLOR_PALETTE.indigo;
                                        return (
                                          <circle
                                            key={sIdx}
                                            cx="21"
                                            cy="21"
                                            r="15.91549430918954"
                                            fill="transparent"
                                            stroke={palette.stroke}
                                            strokeWidth="5.8"
                                            strokeDasharray={dashArray}
                                            strokeDashoffset={dashOffset}
                                            strokeLinecap="butt"
                                            className="transition-all duration-500"
                                          />
                                        );
                                      })}
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                                    <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                      {chart.centerLabel || totalValue.toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                      {chart.centerLabel
                                        ? `${totalValue.toLocaleString('id-ID')} ${chart.unit || 'Total'}`
                                        : chart.unit || 'Total'}
                                    </span>
                                  </div>
                                </div>

                                {/* Legend */}
                                <div className="flex-1 w-full space-y-1.5">
                                  {chart.data.map((slice, sIdx) => {
                                    const val = Math.max(0, Number(slice.value) || 0);
                                    const pct =
                                      totalValue > 0
                                        ? Math.round((val / totalValue) * 1000) / 10
                                        : 0;
                                    const palette =
                                      COLOR_PALETTE[slice.color || 'indigo'] ||
                                      COLOR_PALETTE.indigo;
                                    const sliceUnit = slice.unit || chart.unit;
                                    return (
                                      <div
                                        key={sIdx}
                                        className="flex items-center justify-between text-xs gap-2 px-2 py-1 rounded-lg bg-white/90 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/50"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span
                                            className={`w-2.5 h-2.5 rounded-sm shrink-0 ${palette.bg}`}
                                          />
                                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                                            {slice.label}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                                            {val.toLocaleString('id-ID')}
                                            {sliceUnit ? ` ${sliceUnit}` : ''}
                                          </span>
                                          <span
                                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${palette.lightBg} ${palette.text}`}
                                          >
                                            {pct}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              /* Horizontal Bar Chart */
                              <div className="space-y-2.5 my-auto py-1">
                                {chart.data.map((bar, bIdx) => {
                                  const val = Math.max(0, Number(bar.value) || 0);
                                  const barUnit = bar.unit || chart.unit;
                                  const widthPct =
                                    barUnit === '%'
                                      ? Math.min(100, Math.max(val > 0 ? 4 : 0, val))
                                      : Math.min(
                                          100,
                                          Math.max(val > 0 ? 4 : 0, Math.round((val / maxVal) * 100))
                                        );
                                  const palette =
                                    COLOR_PALETTE[bar.color || 'indigo'] || COLOR_PALETTE.indigo;
                                  return (
                                    <div key={bIdx} className="space-y-1">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                                          {bar.label}
                                        </span>
                                        <span className="font-bold text-slate-900 dark:text-white shrink-0">
                                          {val.toLocaleString('id-ID')}
                                          {barUnit
                                            ? barUnit === '%'
                                              ? '%'
                                              : ` ${barUnit}`
                                            : ''}
                                        </span>
                                      </div>
                                      <div className="w-full h-2.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${palette.bg}`}
                                          style={{ width: `${widthPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* List Items (Catatan Kasus / Siswa Perhatian / Rombel Prestasi) - 2 Column Compact Grid */}
                  {sec.items && sec.items.length > 0 && (() => {
                    const isExpanded = expandedItems[sec.id] ?? false;
                    const INITIAL_LIMIT = 6;
                    const hasMore = sec.items.length > INITIAL_LIMIT;
                    const visibleItems = isExpanded ? sec.items : sec.items.slice(0, INITIAL_LIMIT);

                    return (
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Rincian Butir &amp; Tindak Lanjut ({sec.items.length} Butir):
                          </span>
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedItems((prev) => ({
                                  ...prev,
                                  [sec.id]: !isExpanded,
                                }))
                              }
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline print:hidden cursor-pointer"
                            >
                              {isExpanded
                                ? 'Ringkas Tampilan'
                                : `Lihat Semua (${sec.items.length} Butir)`}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {visibleItems.map((item, itmIdx) => (
                            <div
                              key={itmIdx}
                              className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex flex-col justify-between gap-2 text-xs hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                    {item.title}
                                  </p>
                                  {item.subtitle && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      {item.subtitle}
                                    </p>
                                  )}
                                </div>
                                {item.badge && (
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                                      item.badgeColor ||
                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.note && (
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 italic bg-white/80 dark:bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                                  💡 {item.note}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        {hasMore && !isExpanded && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedItems((prev) => ({
                                ...prev,
                                [sec.id]: true,
                              }))
                            }
                            className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors print:hidden cursor-pointer"
                          >
                            + Tampilkan {sec.items.length - INITIAL_LIMIT} Butir Lainnya
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Empty state bila tidak ada rincian kendala */}
                  {(!sec.stats || sec.stats.length === 0) &&
                    (!sec.todayStats || sec.todayStats.length === 0) &&
                    (!sec.rangeStats || sec.rangeStats.length === 0) &&
                    (!sec.items || sec.items.length === 0) && (
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

      {/* ── 4b. LEADERBOARD GURU TERBAIK & SISWA TERBAIK (TERPISAH: 1 HARI INI vs RENTANG SEMESTER) ── */}
      {briefing.leaderboard && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Leaderboard Apresiasi Kedisiplinan ({leaderboardScope === 'today' ? 'Scope: 1 Hari Ini' : `Rentang: ${briefing.leaderboard.academicContext}`})
            </h3>
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700 text-[11px] font-bold print:hidden">
              <button
                type="button"
                onClick={() => setLeaderboardScope('today')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                  leaderboardScope === 'today'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                📅 Hari Ini (1 Hari)
              </button>
              <button
                type="button"
                onClick={() => setLeaderboardScope('range')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                  leaderboardScope === 'range'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                📊 Rentang Semester
              </button>
            </div>
          </div>

          {(() => {
            const activeTeachers =
              leaderboardScope === 'today'
                ? briefing.leaderboard!.topTeachers
                : briefing.leaderboard!.rangeTopTeachers || [];
            const activeStudents =
              leaderboardScope === 'today'
                ? briefing.leaderboard!.topStudents
                : briefing.leaderboard!.rangeTopStudents || [];
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Guru */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Guru Terbaik ({leaderboardScope === 'today' ? 'Hari Ini' : 'Akumulasi Semester'})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {leaderboardScope === 'today'
                          ? 'Berdasarkan poin kehadiran, jumlah sesi & ketepatan waktu tap hari ini'
                          : 'Berdasarkan akumulasi poin kehadiran & sesi mengajar semester aktif'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {activeTeachers.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        {leaderboardScope === 'today'
                          ? 'Belum ada data kehadiran guru KBM pada hari ini.'
                          : 'Belum ada data peringkat guru semester ini.'}
                      </p>
                    ) : (
                      activeTeachers.map((t) => (
                        <div
                          key={t.rank}
                          className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                                t.rank === 1
                                  ? 'bg-amber-400 text-amber-950'
                                  : t.rank === 2
                                  ? 'bg-slate-300 text-slate-800'
                                  : t.rank === 3
                                  ? 'bg-amber-700/80 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              )}
                            >
                              {t.rank}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{t.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{t.subtitle}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 shrink-0">
                            {t.badge}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Top Siswa */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Siswa Terbaik ({leaderboardScope === 'today' ? 'Hari Ini' : 'Akumulasi Semester'})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {leaderboardScope === 'today'
                          ? 'Kehadiran penuh sesi KBM hari ini tanpa catatan alpa/pelanggaran'
                          : 'Akumulasi kehadiran sesi KBM & prestasi tertinggi semester aktif'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {activeStudents.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        {leaderboardScope === 'today'
                          ? 'Belum ada data kehadiran siswa KBM pada hari ini.'
                          : 'Belum ada data peringkat siswa semester ini.'}
                      </p>
                    ) : (
                      activeStudents.map((s) => (
                        <div
                          key={s.rank}
                          className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                                s.rank === 1
                                  ? 'bg-amber-400 text-amber-950'
                                  : s.rank === 2
                                  ? 'bg-slate-300 text-slate-800'
                                  : s.rank === 3
                                  ? 'bg-amber-700/80 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              )}
                            >
                              {s.rank}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{s.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{s.subtitle}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 shrink-0">
                            {s.badge}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── 4c. GALERI BUKTI KBM HARI INI (STRICT SCOPE: 1 HARI INI) ── */}
      {briefing.kbmGallery && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-indigo-500" />
              Galeri Dokumentasi &amp; Bukti KBM Hari Ini (Scope: 1 Hari Ini)
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
              {briefing.kbmGallery.items.length} Foto Hari Ini
            </span>
          </div>
          {briefing.kbmGallery.items.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              Belum ada foto dokumentasi bukti KBM yang diunggah pada sesi KBM hari ini ({briefing.tanggalStr}).
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {briefing.kbmGallery.items.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  className="group text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={resolveProfilePhotoUrl(photo.photoUrl)}
                      alt={`${photo.mapel} - ${photo.kelas}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-bold backdrop-blur-xs">
                      {photo.kelas}
                    </span>
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                      {photo.waktu}
                    </span>
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{photo.mapel}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{photo.guru}</p>
                    </div>
                    {photo.jurnal && (
                      <p className="text-[10px] text-slate-400 italic truncate mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        &ldquo;{photo.jurnal}&rdquo;
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal untuk Foto Bukti KBM */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedPhoto.mapel} — {selectedPhoto.kelas}
                </h4>
                <p className="text-xs text-slate-500">
                  {selectedPhoto.guru} • Pukul {selectedPhoto.waktu}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={resolveProfilePhotoUrl(selectedPhoto.photoUrl)}
                alt={selectedPhoto.mapel}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            {selectedPhoto.jurnal && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold">Catatan Jurnal KBM: </span>
                {selectedPhoto.jurnal}
              </div>
            )}
          </div>
        </div>
      )}

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
