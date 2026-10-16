import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Coins, 
  Clock, 
  Landmark, 
  ArrowUpRight, 
  CheckCircle2,
  PhoneCall,
  Calendar
} from 'lucide-react';
import { SectionCard } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatRupiahCompact, formatRupiahFull } from './CoopExecutiveKpiCards';
import type { CoopManagementStats } from './types';

interface CoopLiquidityRadarSectionProps {
  stats: CoopManagementStats;
}

export const CoopLiquidityRadarSection: React.FC<CoopLiquidityRadarSectionProps> = React.memo(({
  stats,
}) => {
  const topOverdue = stats.loanPortfolio?.topOverdue || [];
  const dueInstallments = stats.dueInstallments || 0;
  const dueAmount = stats.dueInstallmentsAmount || 0;
  const nplRatio = stats.loanPortfolio?.nplRatio ?? 0;

  // Likuiditas: Simpanan - Pinjaman Beredar
  const totalSavings = Number(stats.totalSavings || 0);
  const totalLoans = Number(stats.totalLoans || 0);
  const idleLiquidity = Math.max(0, totalSavings - totalLoans);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
      
      {/* ── 1. RADAR JATUH TEMPO & EARLY WARNING ANGSURAN ── */}
      <SectionCard
        title="Radar Jatuh Tempo & Risiko Kredit"
        action={
          <Link
            to="/cooperative/loans"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Buku Pinjaman</span>
            <ArrowUpRight size={13} />
          </Link>
        }
        fullWidth
        noPadding
      >
        <div className="p-4 sm:p-5 space-y-3">
          {dueInstallments > 0 || topOverdue.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>{dueInstallments} Tagihan Angsuran</strong> jatuh tempo (Total: {formatRupiahCompact(dueAmount)})
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                  NPL: {nplRatio}%
                </span>
              </div>

              {/* Daftar Peminjam Jatuh Tempo */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {topOverdue.slice(0, 3).map((debtor) => (
                  <div
                    key={debtor.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {debtor.memberName}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={11} className="text-amber-500" />
                        <span>Lewat {debtor.daysOverdue} hari</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatRupiahCompact(debtor.amount)}
                      </p>
                      <Link
                        to={`/cooperative/loans?search=${encodeURIComponent(debtor.memberName)}`}
                        className="text-[10px] text-indigo-600 hover:underline font-bold"
                      >
                        Buka Kartu &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center space-y-2 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Portofolio Pinjaman Sehat (0% NPL)
                </h4>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 max-w-xs mt-0.5">
                  Seluruh {stats.activeLoansCount || 0} pinjaman beredar berstatus lancar tanpa ada tunggakan jatuh tempo kritis.
                </p>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── 2. INDIKATOR LIKUIDITAS & DAYA PINJAM KOPERASI ── */}
      <SectionCard
        title="Likuiditas & Ketahanan Modal"
        action={
          <Link
            to="/cooperative/cash-bank"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Arus Kas</span>
            <ArrowUpRight size={13} />
          </Link>
        }
        fullWidth
        noPadding
      >
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Dana Siap Salur (Idle)
              </span>
              <span 
                title={formatRupiahFull(idleLiquidity)}
                className="font-mono font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 truncate block cursor-help"
              >
                {formatRupiahCompact(idleLiquidity)}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                Simpanan belum tersalurkan
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Omzet Toko Hari Ini
              </span>
              <span 
                title={formatRupiahFull(stats.storeSalesToday)}
                className="font-mono font-black text-sm sm:text-base text-blue-600 dark:text-blue-400 truncate block cursor-help"
              >
                {formatRupiahCompact(stats.storeSalesToday || 0)}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {stats.storeSalesCountToday || 0} transaksi POS berhasil
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Landmark size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">
                Penyaluran Pinjaman terhadap Simpanan:
              </span>
            </div>
            <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300">
              {totalSavings > 0 ? Math.min(100, Math.round((totalLoans / totalSavings) * 100)) : 0}%
            </span>
          </div>
        </div>
      </SectionCard>

    </div>
  );
});

CoopLiquidityRadarSection.displayName = 'CoopLiquidityRadarSection';
