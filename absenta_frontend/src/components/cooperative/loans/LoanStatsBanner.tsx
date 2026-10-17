import React, { useState } from 'react';
import { Clock, Wallet, CheckCircle2, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import type { StudentMetrics, OperatorMetrics } from './types';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface LoanStatsBannerProps {
  isStudent: boolean;
  studentMetrics: StudentMetrics | null;
  operatorMetrics: OperatorMetrics | null;
  onPaymentInstructionsOpen?: () => void;
  variant?: 'default' | 'compact-premium';
  mobileCompact?: boolean;
}

export const LoanStatsBanner = React.memo<LoanStatsBannerProps>(({
  isStudent,
  studentMetrics,
  operatorMetrics,
  onPaymentInstructionsOpen,
}) => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Mode Operator (Pengurus)
  const opTitle1 = operatorMetrics?.card1Title || 'Pengajuan Menunggu';
  const opVal1 = operatorMetrics?.card1Val || '0 Berkas';
  const opTitle2 = operatorMetrics?.card2Title || 'Pinjaman Aktif';
  const opVal2 = operatorMetrics?.card2Val || '0 Berjalan';
  const opTitle3 = operatorMetrics?.card3Title || 'Total Penyaluran';
  const opVal3 = operatorMetrics?.card3Val || 'Rp 0';

  // Mode Student (Member)
  const stTitle1 = studentMetrics?.card1Title || 'Status Pinjaman';
  const stVal1 = studentMetrics?.card1Val || '-';
  const stSub1 = studentMetrics?.card1Sub;
  const stTitle2 = studentMetrics?.card2Title || 'Sisa Pokok Pinjaman';
  const stVal2 = studentMetrics?.card2Val || 'Rp 0';
  const stSub2 = studentMetrics?.card2Sub;
  const stTitle3 = studentMetrics?.card3Title || 'Tagihan Berjalan';
  const stVal3 = studentMetrics?.card3Val || 'Rp 0';

  return (
    <div className="w-full max-w-full min-w-0 space-y-2 mb-3">
      {/* Mobile Collapsible Header Bar */}
      <div className="flex sm:hidden items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
          <BarChart2 size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>Ringkasan Pinjaman</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          aria-label={isCollapsed ? 'Tampilkan ringkasan' : 'Sembunyikan ringkasan'}
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 animate-in fade-in duration-200">
          {/* ── CARD 1: PENGAJUAN MENUNGGU / STATUS PINJAMAN ────────────────── */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Clock size={14} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isStudent ? stTitle1 : opTitle1}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {isStudent ? 'Pribadi' : 'Verifikasi'}
              </span>
            </div>

            <div className="my-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100 block">
                {isStudent ? stVal1 : opVal1}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>{isStudent ? (stSub1 || 'Status Berkas') : 'Perlu Ditinjau'}</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {isStudent ? 'Akun Aktif' : 'Antrean'}
              </span>
            </div>
          </div>

          {/* ── CARD 2: PINJAMAN BERJALAN / SISA POKOK ─────────────────────── */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Wallet size={14} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isStudent ? stTitle2 : opTitle2}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {isStudent ? 'Kewajiban' : 'Aktif'}
              </span>
            </div>

            <div className="my-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-indigo-650 dark:text-indigo-400 block">
                {isStudent ? stVal2 : opVal2}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>{isStudent ? (stSub2 || 'Sisa Pokok') : 'Sedang Berjalan'}</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {isStudent ? 'Cicilan' : 'Terjadwal'}
              </span>
            </div>
          </div>

          {/* ── CARD 3: TOTAL PENYALURAN / JATUH TEMPO ────────────────────── */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <CheckCircle2 size={14} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isStudent ? stTitle3 : opTitle3}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                {isStudent ? 'Tagihan' : 'Akumulasi'}
              </span>
            </div>

            <div className="my-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 block">
                {isStudent ? stVal3 : opVal3}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {isStudent 
                  ? (studentMetrics?.isOverdue ? '⚠️ Terlambat' : studentMetrics?.card3Sub || 'Lancar') 
                  : 'Total Dana Salur'}
              </span>
              {isStudent && studentMetrics?.hasApprovedLoans && onPaymentInstructionsOpen ? (
                <button
                  type="button"
                  onClick={onPaymentInstructionsOpen}
                  className="font-bold text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Cara Bayar →
                </button>
              ) : (
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {isStudent ? 'Mandiri' : 'Kredit'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

LoanStatsBanner.displayName = 'LoanStatsBanner';

