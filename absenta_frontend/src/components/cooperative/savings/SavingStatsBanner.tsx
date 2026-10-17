import React, { useMemo, useState } from 'react';
import { 
  Landmark, 
  ShieldCheck, 
  PieChart, 
  BarChart2, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import type { Saving } from './types';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface SavingStatsBannerProps {
  savings: Saving[];
  variant?: 'default' | 'compact-premium';
  mobileCompact?: boolean;
  loading?: boolean;
}

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

const fmtShort = (n: number) => {
  if (n >= 1_000_000_000) {
    const m = n / 1_000_000_000;
    return `Rp ${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000_000) {
    const jt = n / 1_000_000;
    return `Rp ${jt % 1 === 0 ? jt : jt.toFixed(1)}Jt`;
  }
  if (n >= 1_000) {
    return `Rp ${Math.round(n / 1_000)}k`;
  }
  return `Rp ${n}`;
};

export const SavingStatsBanner = React.memo<SavingStatsBannerProps>(({
  savings,
  loading = false
}) => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const stats = useMemo(() => {
    let totalBalance = 0;
    let totalPokok = 0;
    let totalWajib = 0;
    let totalSukarela = 0;
    let totalLainnya = 0;

    const memberMap: Record<string, { hasPokok: boolean; hasWajib: boolean }> = {};

    savings?.forEach((s) => {
      const amt = parseFloat(s.amount) || 0;
      totalBalance += amt;

      const code = (s.category?.code || s.type || 'LAINNYA').toUpperCase();

      if (code.includes('POKOK')) totalPokok += amt;
      else if (code.includes('WAJIB')) totalWajib += amt;
      else if (code.includes('SUKARELA')) totalSukarela += amt;
      else totalLainnya += amt;

      const memKey = s.memberId || s.member?.memberNo || s.member?.name || 'unknown';
      if (!memberMap[memKey]) {
        memberMap[memKey] = { hasPokok: false, hasWajib: false };
      }
      if (code.includes('POKOK') && amt > 0) memberMap[memKey].hasPokok = true;
      if (code.includes('WAJIB') && amt > 0) memberMap[memKey].hasWajib = true;
    });

    const membersList = Object.values(memberMap);
    const totalMembers = membersList.length || 0;
    const lunasWajibCount = membersList.filter(m => m.hasWajib).length;
    const belumWajibCount = Math.max(0, totalMembers - lunasWajibCount);
    const complianceRate = totalMembers > 0 ? Math.round((lunasWajibCount / totalMembers) * 100) : 0;
    const modalTetap = totalPokok + totalWajib;
    const modalTetapPct = totalBalance > 0 ? Math.round((modalTetap / totalBalance) * 100) : 100;

    return {
      totalBalance,
      totalPokok,
      totalWajib,
      totalSukarela,
      totalLainnya,
      modalTetapPct,
      accountsCount: savings?.length || 0,
      totalMembers,
      lunasWajibCount,
      belumWajibCount,
      complianceRate,
    };
  }, [savings]);

  if (loading) {
    return (
      <div className="w-full max-w-full min-w-0 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200/50 dark:border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-2 mb-3">
      {/* Mobile Collapsible Header Bar */}
      <div className="flex sm:hidden items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
          <BarChart2 size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>Ringkasan Simpanan</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          aria-label={isCollapsed ? 'Tampilkan statistik' : 'Sembunyikan statistik'}
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 animate-in fade-in duration-200">
          {/* ── CARD 1: TOTAL SIMPANAN ────────────────── */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Landmark size={14} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total Simpanan
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {stats.totalMembers} Anggota
              </span>
            </div>

            <div className="my-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100 block">
                {fmt(stats.totalBalance)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>{stats.accountsCount} Rekening</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                Tetap {stats.modalTetapPct}%
              </span>
            </div>
          </div>

          {/* ── CARD 2: KEPATUHAN IURAN ────────────────────── */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck size={14} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kepatuhan Iuran
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                stats.complianceRate >= 80
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {stats.complianceRate}% Disiplin
              </span>
            </div>

            <div className="my-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100 block">
                {stats.lunasWajibCount}
                <span className="text-sm font-semibold text-slate-400 ml-1">/ {stats.totalMembers}</span>
              </span>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.complianceRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, stats.complianceRate)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ {stats.lunasWajibCount} Lunas
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                ⚠️ {stats.belumWajibCount} Belum
              </span>
            </div>
          </div>

          {/* ── CARD 3: KOMPOSISI SIMPANAN ───────────────────── */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <PieChart size={14} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Komposisi
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-2">
              <div className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">Pokok</span>
                <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">{fmtShort(stats.totalPokok)}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">Wajib</span>
                <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">{fmtShort(stats.totalWajib)}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Sukarela</span>
                <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">{fmtShort(stats.totalSukarela)}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Raya</span>
                <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">{fmtShort(stats.totalLainnya)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Alokasi Simpanan</span>
              <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                100%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SavingStatsBanner.displayName = 'SavingStatsBanner';
