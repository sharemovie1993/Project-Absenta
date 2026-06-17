import React from 'react';
import { Users, ShieldCheck, Coins } from 'lucide-react';

interface MemberStatsBannerProps {
  total: number;
  active: number;
  totalSavings: number;
}

export const MemberStatsBanner: React.FC<MemberStatsBannerProps> = ({
  total,
  active,
  totalSavings
}) => {
  const activePercentage = total ? (active / total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Card 1: Total Anggota */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-transparent border border-indigo-100/40 dark:border-indigo-900/20 p-5 flex items-center justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Total Anggota</span>
          <h3 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            {total} <span className="text-xs font-normal text-slate-400">Orang</span>
          </h3>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Terdaftar dalam sistem koperasi
          </p>
        </div>
        <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
          <Users size={24} />
        </div>
      </div>

      {/* Card 2: Anggota Aktif */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-100/40 dark:border-emerald-900/20 p-5 flex items-center justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Anggota Aktif</span>
          <h3 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            {active} <span className="text-xs font-normal text-slate-400">Orang</span>
          </h3>
          <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
            +{activePercentage.toFixed(1)}% partisipasi aktif
          </p>
        </div>
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
          <ShieldCheck size={24} />
        </div>
      </div>

      {/* Card 3: Total Simpanan Terkumpul */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-100/40 dark:border-amber-900/20 p-5 flex items-center justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Kas Tabungan Terkumpul</span>
          <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            Rp {totalSavings.toLocaleString('id-ID')}
          </h3>
          <p className="text-[10px] text-slate-400">Akumulasi Simpanan Anggota</p>
        </div>
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
          <Coins size={24} />
        </div>
      </div>
    </div>
  );
};
