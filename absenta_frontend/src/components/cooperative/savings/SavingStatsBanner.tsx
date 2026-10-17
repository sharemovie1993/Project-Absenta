import React, { useMemo, useState } from 'react';
import { 
  Landmark, 
  ShieldCheck, 
  PieChart, 
  Users, 
  BarChart2, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles
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

    const categoryMap: Record<string, { name: string; color?: string; amount: number; count: number }> = {};
    const memberMap: Record<string, { hasPokok: boolean; hasWajib: boolean; name: string }> = {};

    savings?.forEach((s) => {
      const amt = parseFloat(s.amount) || 0;
      totalBalance += amt;

      const code = (s.category?.code || s.type || 'LAINNYA').toUpperCase();
      const name = s.category?.name || s.type || 'Lainnya';
      const color = s.category?.color;

      if (!categoryMap[code]) {
        categoryMap[code] = { name, color, amount: 0, count: 0 };
      }
      categoryMap[code].amount += amt;
      categoryMap[code].count += 1;

      if (code.includes('POKOK')) totalPokok += amt;
      else if (code.includes('WAJIB')) totalWajib += amt;
      else if (code.includes('SUKARELA')) totalSukarela += amt;
      else totalLainnya += amt;

      const memKey = s.memberId || s.member?.memberNo || s.member?.name || 'unknown';
      if (!memberMap[memKey]) {
        memberMap[memKey] = { hasPokok: false, hasWajib: false, name: s.member?.name || '' };
      }
      if (code.includes('POKOK') && amt > 0) memberMap[memKey].hasPokok = true;
      if (code.includes('WAJIB') && amt > 0) memberMap[memKey].hasWajib = true;
    });

    const categories = Object.entries(categoryMap).map(([code, v]) => ({ code, ...v }));
    const membersList = Object.values(memberMap);
    const totalMembers = membersList.length || 0;
    const lunasWajibCount = membersList.filter(m => m.hasWajib).length;
    const belumWajibCount = Math.max(0, totalMembers - lunasWajibCount);
    const lunasPokokCount = membersList.filter(m => m.hasPokok).length;
    const belumPokokCount = Math.max(0, totalMembers - lunasPokokCount);

    const complianceRate = totalMembers > 0 ? Math.round((lunasWajibCount / totalMembers) * 100) : 0;
    const modalTetap = totalPokok + totalWajib;
    const modalTetapPct = totalBalance > 0 ? Math.round((modalTetap / totalBalance) * 100) : 100;
    const danaLikuid = totalSukarela + totalLainnya;
    const danaLikuidPct = totalBalance > 0 ? Math.round((danaLikuid / totalBalance) * 100) : 0;

    return {
      totalBalance,
      totalPokok,
      totalWajib,
      totalSukarela,
      totalLainnya,
      modalTetap,
      modalTetapPct,
      danaLikuid,
      danaLikuidPct,
      accountsCount: savings?.length || 0,
      totalMembers,
      lunasWajibCount,
      belumWajibCount,
      lunasPokokCount,
      belumPokokCount,
      complianceRate,
      categories,
    };
  }, [savings]);

  if (loading) {
    return (
      <div className="w-full max-w-full min-w-0 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200/50 dark:border-slate-800" />
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
          <span>Dashboard Finansial Pengurus</span>
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
          {/* ── CARD 1: TOTAL KAS SIMPANAN & LIKUIDITAS ────────────────── */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-4.5 shadow-2xs hover:shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between group">
            {/* Soft decorative gradient pill behind */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-bl-full pointer-events-none -mr-6 -mt-6 transition-all group-hover:scale-105" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Landmark size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
                      Total Kas Simpanan
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Saldo Bersih Tabungan Anggota
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                  <Users size={10} />
                  {stats.totalMembers} Anggota
                </span>
              </div>

              <div className="my-2.5">
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100 block">
                  {fmt(stats.totalBalance)}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
                  Dari total <b className="text-slate-700 dark:text-slate-200">{stats.accountsCount} rekening</b> simpanan aktif
                </span>
              </div>
            </div>

            {/* Segmented Bar: Modal Mengendap vs Dana Likuid */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Lock size={10} /> Modal Tetap ({stats.modalTetapPct}%)
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles size={10} /> Likuid ({stats.danaLikuidPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 flex overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-500" 
                  style={{ width: `${stats.modalTetapPct}%` }}
                  title={`Modal Tetap (Pokok+Wajib): ${fmt(stats.modalTetap)}`}
                />
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${stats.danaLikuidPct}%` }}
                  title={`Dana Likuid (Sukarela/Lainnya): ${fmt(stats.danaLikuid)}`}
                />
              </div>
            </div>
          </div>

          {/* ── CARD 2: KEPATUHAN IURAN WAJIB & POKOK ────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-4.5 shadow-2xs hover:shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all flex flex-col justify-between group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-bl-full pointer-events-none -mr-6 -mt-6 transition-all group-hover:scale-105" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
                      Kepatuhan Iuran
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Kedisiplinan Simpanan Wajib
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  stats.complianceRate >= 80
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200'
                }`}>
                  {stats.complianceRate}% Disiplin
                </span>
              </div>

              <div className="my-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                    {stats.lunasWajibCount}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    dari {stats.totalMembers} Anggota Lunas Wajib
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      stats.complianceRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, stats.complianceRate)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actionable Insight Tags for Management */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span>{stats.lunasWajibCount} Lunas</span>
              </div>
              <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold">
                <AlertCircle size={11} className="text-amber-500" />
                <span>{stats.belumWajibCount} Belum Bayar</span>
              </div>
            </div>
          </div>

          {/* ── CARD 3: KOMPOSISI PORTOFOLIO SIMPANAN ───────────────────── */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-4.5 shadow-2xs hover:shadow-xs hover:border-sky-300 dark:hover:border-sky-800 transition-all flex flex-col justify-between group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-sky-50/60 dark:bg-sky-950/20 rounded-bl-full pointer-events-none -mr-6 -mt-6 transition-all group-hover:scale-105" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <PieChart size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
                      Komposisi Portofolio
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Distribusi Alokasi Simpanan
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  4 Pos Dana
                </span>
              </div>

              {/* Minimal Clean Grid for 4 Categories */}
              <div className="grid grid-cols-2 gap-2 my-2">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Pokok</span>
                    <span className="font-mono text-slate-400 text-[9px]">
                      {stats.totalBalance > 0 ? Math.round((stats.totalPokok / stats.totalBalance) * 100) : 0}%
                    </span>
                  </div>
                  <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                    {fmtShort(stats.totalPokok)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-sky-600 dark:text-sky-400">Wajib</span>
                    <span className="font-mono text-slate-400 text-[9px]">
                      {stats.totalBalance > 0 ? Math.round((stats.totalWajib / stats.totalBalance) * 100) : 0}%
                    </span>
                  </div>
                  <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                    {fmtShort(stats.totalWajib)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Sukarela</span>
                    <span className="font-mono text-slate-400 text-[9px]">
                      {stats.totalBalance > 0 ? Math.round((stats.totalSukarela / stats.totalBalance) * 100) : 0}%
                    </span>
                  </div>
                  <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                    {fmtShort(stats.totalSukarela)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Raya / Lain</span>
                    <span className="font-mono text-slate-400 text-[9px]">
                      {stats.totalBalance > 0 ? Math.round((stats.totalLainnya / stats.totalBalance) * 100) : 0}%
                    </span>
                  </div>
                  <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                    {fmtShort(stats.totalLainnya)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Struktur Modal Koperasi</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">Seimbang</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SavingStatsBanner.displayName = 'SavingStatsBanner';
