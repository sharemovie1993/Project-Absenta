import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Calendar, ShieldCheck, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface JadwalNavPillProps {
  className?: string;
}

const JADWAL_NAV_ITEMS = [
  {
    label: 'Jam KBM & Shift',
    shortLabel: 'Jam KBM',
    path: '/kurikulum/jam-kbm',
    icon: Clock,
    badge: '1. Setup Waktu',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/20'
  },
  {
    label: 'Jadwal Pelajaran',
    shortLabel: 'Matriks Jadwal',
    path: '/kurikulum/jadwal',
    icon: Calendar,
    badge: '2. Matriks Utama',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/20'
  },
  {
    label: 'Jadwal Piket Guru',
    shortLabel: 'Piket Guru',
    path: '/kurikulum/jadwal-piket',
    icon: ShieldCheck,
    badge: '3. Piket Harian',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/20'
  },
  {
    label: 'Kontrak KBM Guru',
    shortLabel: 'Kontrak KBM',
    path: '/kurikulum/jadwal-kontrak-kbm',
    icon: Layers,
    badge: '4. Beban Jam',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-400/20'
  }
];

export const JadwalNavPill: React.FC<JadwalNavPillProps> = ({ className }) => {
  const location = useLocation();
  const currentPath = location.pathname.toLowerCase();

  return (
    <div className={cn("w-full mb-3 animate-in fade-in slide-in-from-top-1 duration-200", className)}>
      <div className="flex items-center justify-between gap-3 flex-wrap p-1.5 sm:p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Navigation Tabs (Segmented Control) */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {JADWAL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path.toLowerCase();

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer select-none border",
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 scale-[1.02]"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Icon size={14} className={cn("stroke-[2.2]", isActive ? "text-white" : "text-indigo-500 dark:text-indigo-400")} />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="inline sm:hidden">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>

        {/* Info Hint */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 pr-2">
          <Sparkles size={13} className="text-amber-500" />
          <span>Pusat Manajemen Jadwal Kurikulum</span>
        </div>
      </div>
    </div>
  );
};

export default JadwalNavPill;
