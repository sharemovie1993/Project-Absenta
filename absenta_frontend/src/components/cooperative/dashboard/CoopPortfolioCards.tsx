import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  PiggyBank, 
  TrendingUp, 
  Calculator, 
  ExternalLink,
  ShieldCheck,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { formatDate } from '@/utils/date.utils';
import type { WajibComplianceData, LoanPortfolioData, EstimatedShuYtdData } from './types';

interface CoopPortfolioCardsProps {
  wajibCompliance?: WajibComplianceData;
  loanPortfolio?: LoanPortfolioData;
  estimatedShuYtd?: EstimatedShuYtdData;
}

export const CoopPortfolioCards: React.FC<CoopPortfolioCardsProps> = React.memo(({
  wajibCompliance,
  loanPortfolio,
  estimatedShuYtd,
}) => {
  const compliance = wajibCompliance || {
    totalActive: 0,
    paidCount: 0,
    unpaidCount: 0,
    compliancePercent: 100,
  };

  const portfolio = loanPortfolio || {
    totalActiveLoans: 0,
    totalOutstanding: 0,
    currentAmount: 0,
    overdue1to30Amount: 0,
    overdueOver30Amount: 0,
    nplRatio: 0,
    topOverdue: [],
  };

  const shu = estimatedShuYtd || {
    year: new Date().getFullYear(),
    totalEstimatedShu: 0,
    estimatedStoreProfit: 0,
    interestIncome: 0,
    totalYearSales: 0,
    status: 'BERJALAN',
  };

  const isNplSafe = portfolio.nplRatio <= 5.0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      
      {/* ── CARD 1: Kepatuhan Simpanan Wajib Bulan Ini ── */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <PiggyBank size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Kepatuhan Simpanan Wajib
                </h4>
                <p className="text-[10px] text-slate-400">Bulan Berjalan</p>
              </div>
            </div>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
              compliance.compliancePercent >= 80 
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}>
              {compliance.compliancePercent}% Lunas
            </span>
          </div>

          <div className="py-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800 dark:text-white">
                {compliance.paidCount} <span className="text-xs text-slate-400 font-semibold">/ {compliance.totalActive} Anggota</span>
              </span>
              {compliance.unpaidCount > 0 ? (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {compliance.unpaidCount} Belum Bayar
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Lunas Semua
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, compliance.compliancePercent)}%` }}
              />
            </div>
          </div>
        </div>

        <Link
          to="/cooperative/savings"
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800"
        >
          <span>Buka Mutasi Simpanan</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* ── CARD 2: Kualitas Kredit & Rasio NPL ── */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Kolektibilitas Pinjaman
                </h4>
                <p className="text-[10px] text-slate-400">Rasio Risiko NPL</p>
              </div>
            </div>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
              isNplSafe
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
            }`}>
              {portfolio.nplRatio}% NPL {isNplSafe ? '(Sehat)' : '(Waspada)'}
            </span>
          </div>

          <div className="py-4 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <p className="text-slate-400 text-[10px]">Lancar (0 Hari)</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Rp {Math.round(portfolio.currentAmount).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <p className="text-slate-400 text-[10px]">Tunggakan {'>'} 30 Hari</p>
                <p className={`font-bold ${portfolio.overdueOver30Amount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  Rp {Math.round(portfolio.overdueOver30Amount).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {portfolio.topOverdue?.length > 0 ? (
              <div className="space-y-1 pt-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tunggakan Tertunda:</p>
                {portfolio.topOverdue?.slice(0, 2)?.map((deb) => (
                  <div key={deb.id} className="flex items-center justify-between text-[11px] bg-rose-50/50 dark:bg-rose-950/20 px-2.5 py-1 rounded-lg border border-rose-100/50 dark:border-rose-900/30">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                      {deb.memberName}
                    </span>
                    <span className="text-rose-600 font-bold text-[10px]">
                      Telat {deb.daysOverdue} hari
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-emerald-600 font-medium pt-1 flex items-center gap-1">
                <CheckCircle2 size={13} />
                Tidak ada tunggakan pinjaman kritis.
              </p>
            )}
          </div>
        </div>

        <Link
          to="/cooperative/loans"
          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800"
        >
          <span>Kelola Portofolio Pinjaman</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* ── CARD 3: Estimasi Akumulasi SHU Tahun Berjalan ── */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Calculator size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Estimasi SHU {shu.year}
                </h4>
                <p className="text-[10px] text-slate-400">Akumulasi Berjalan</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60">
              {shu.status}
            </span>
          </div>

          <div className="py-4 space-y-3">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Estimasi Total SHU YTD:</p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                Rp {Math.round(shu.totalEstimatedShu).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400">Laba Usaha Toko:</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  Rp {Math.round(shu.estimatedStoreProfit).toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Pendapatan Jasa Bunga:</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  Rp {Math.round(shu.interestIncome).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Link
          to="/cooperative/shu"
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800"
        >
          <span>Konfigurasi & Pembagian SHU</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

    </div>
  );
});

CoopPortfolioCards.displayName = 'CoopPortfolioCards';
