import React from 'react';
import { User, Building2, ShieldCheck, MapPin } from 'lucide-react';

interface HubinPklHeaderInfoProps {
  siswaName: string;
  mitraName: string;
  pembimbingName?: string;
  totalKunjungan?: number;
  variant?: 'compact' | 'detailed';
}

export const HubinPklHeaderInfo: React.FC<HubinPklHeaderInfoProps> = ({
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm">
          <User size={20} className="text-slate-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Siswa Dipantau</p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{siswaName}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
            <Building2 size={12} className="text-slate-400" />
            <span className="truncate max-w-[150px]">{mitraName}</span>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck size={20} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Pembimbing Lapangan</p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{pembimbingName || 'Belum ditunjuk'}</p>
          {totalKunjungan !== undefined && (
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
              <MapPin size={12} className="text-amber-500" />
              <span>Total Kunjungan: {totalKunjungan} kali</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
