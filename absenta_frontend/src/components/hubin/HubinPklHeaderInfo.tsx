import React from 'react';
import { User, Building2, ShieldCheck, MapPin } from 'lucide-react';

interface HubinPklHeaderInfoProps {
  siswaName: string;
  mitraName: string;
  pembimbingName?: string;
  totalKunjungan?: number;
  variant?: 'compact' | 'detailed';
}

export const HubinPklHeaderInfo: React.FC<HubinPklHeaderInfoProps> = React.memo(({
  siswaName,
  mitraName,
  pembimbingName,
  totalKunjungan,
  variant = 'detailed'
}) => {
  if (variant === 'compact') {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Siswa Ternilai</p>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{siswaName}</p>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
          <Building2 size={12} className="text-slate-400" />
          <span>Mitra PKL: {mitraName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
        {/* Siswa Dipantau */}
        <div className="flex items-center sm:items-start gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
            <User size={16} className="text-slate-400 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between sm:block">
              <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Siswa Dipantau
              </p>
              {totalKunjungan !== undefined && (
                <span className="sm:hidden text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                  {totalKunjungan} Kunjungan
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {siswaName}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
              <Building2 size={11} className="text-slate-400 shrink-0" />
              <span className="truncate">{mitraName}</span>
            </div>
          </div>
        </div>
        
        {/* Pembimbing Lapangan */}
        <div className="flex items-center sm:items-start gap-2.5 sm:gap-3 border-t sm:border-t-0 sm:border-l border-slate-200/60 dark:border-slate-800/80 pt-2 sm:pt-0 sm:pl-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck size={16} className="text-emerald-500 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Pembimbing Lapangan
            </p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {pembimbingName || 'Belum ditunjuk'}
            </p>
            {totalKunjungan !== undefined && (
              <div className="hidden sm:flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                <MapPin size={12} className="text-amber-500" />
                <span>Total Kunjungan: {totalKunjungan} kali</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
