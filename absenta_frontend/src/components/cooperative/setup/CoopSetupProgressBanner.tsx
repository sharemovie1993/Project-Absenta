import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  BookOpen, 
  Layers, 
  Users, 
  Scale, 
  Check, 
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { coopSetupApi } from '../../../api/coopSetup.api';
import toast from 'react-hot-toast';

interface CoopSetupProgressBannerProps {
  onOpenWizard: () => void;
  className?: string;
}

export const CoopSetupProgressBanner: React.FC<CoopSetupProgressBannerProps> = ({ 
  onOpenWizard,
  className = ''
}) => {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['coop-setup-status'],
    queryFn: coopSetupApi.getStatus,
    staleTime: 1000 * 60 * 2, // 2 menit
  });

  const completeMutation = useMutation({
    mutationFn: coopSetupApi.completeSetup,
    onSuccess: () => {
      toast.success('Inisialisasi koperasi dinyatakan selesai! Operasional penuh aktif.');
      queryClient.invalidateQueries({ queryKey: ['coop-setup-status'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyelesaikan setup koperasi');
    }
  });

  if (isLoading || !status) {
    return null;
  }

  const isCompleted = status.setupStatus === 'COMPLETED';
  const percentage = status.readinessPercentage || 0;

  const modeLabels: Record<string, string> = {
    NEW_COOP: 'Koperasi Baru Berdiri (Fresh Start)',
    MIGRATION_START_YEAR: 'Migrasi Koperasi Berjalan (Awal Tahun)',
    MIGRATION_MID_YEAR: 'Migrasi Koperasi Berjalan (Tengah Tahun Konsolidasi)',
  };

  // Tampilan ringkas ketika setup sudah selesai 100%
  if (isCompleted) {
    return (
      <div className={`w-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                Setup & Konsolidasi Koperasi Selesai
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Check className="w-3 h-3" /> Siap Operasional Penuh
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Bagan akun SAK ETAP aktif ({status.coaCount} akun) &bull; Mode: {modeLabels[status.setupMode] || status.setupMode}
              {status.cutoffDate ? ` &bull; Cut-off: ${status.cutoffDate}` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenWizard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-emerald-300/80 dark:border-emerald-700/60 transition-colors shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Tinjau / Buka Wizard Lagi
        </button>
      </div>
    );
  }

  // Tampilan Onboarding Aktif (In Progress / Not Started)
  return (
    <div className={`w-full bg-gradient-to-br from-indigo-50/90 via-sky-50/70 to-emerald-50/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-4 sm:p-5 shadow-sm transition-all relative overflow-hidden ${className}`}>
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Title & Status */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white shadow-xs">
              <Sparkles className="w-3 h-3" />
              Accurate-Style Onboarding Wizard
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
              {modeLabels[status.setupMode] || 'Mode Operasional Belum Diatur'}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Panduan Langkah Awal Koperasi Baru & Migrasi Pembukuan
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Ikuti wizard 5 langkah untuk menyiapkan bagan akun standar (SAK ETAP), jurnal saldo awal neraca yang seimbang, dan rekonsiliasi simpanan/pinjaman anggota secara akurat.
            </p>
          </div>

          {/* Quick Pillar Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${status.coaInitialized ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400'}`}>
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">COA SAK ETAP ({status.coaCount})</span>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${status.hasOpeningJournal ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400'}`}>
              <Scale className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{status.hasOpeningJournal ? 'Saldo Neraca ✅' : 'Saldo Awal'}</span>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${status.memberCount > 0 ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400'}`}>
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{status.memberCount} Anggota Terdaftar</span>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${status.membersWithSavingsCount > 0 ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400'}`}>
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Subledger Rekonsiliasi</span>
            </div>
          </div>
        </div>

        {/* Right Side: Progress Meter & Action Buttons */}
        <div className="flex flex-col items-start lg:items-end justify-between gap-3 shrink-0 min-w-[240px]">
          {/* Progress Bar */}
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Kesiapan Onboarding</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{percentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {percentage >= 70 && (
              <button
                type="button"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors shadow-xs"
              >
                {completeMutation.isPending ? 'Memproses...' : 'Tandai Selesai'}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenWizard}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 transition-all shadow-md shadow-indigo-600/20"
            >
              <span>{status.setupStatus === 'NOT_STARTED' ? 'Mulai Setup Sekarang' : 'Lanjutkan Wizard Setup'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
