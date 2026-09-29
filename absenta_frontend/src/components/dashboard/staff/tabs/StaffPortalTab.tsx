import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  Sparkles, 
  LayoutGrid, 
  ArrowUpRight, 
  ArrowLeft
} from 'lucide-react';
import { ABSENTA_APPS_REGISTRY, type AbsentaApp } from '@/config/absentaAppsRegistry';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface StaffPortalTabProps {
  onBackToBeranda?: () => void;
}

export const StaffPortalTab: React.FC<StaffPortalTabProps> = ({ onBackToBeranda }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return ABSENTA_APPS_REGISTRY;
    const q = searchQuery.toLowerCase().trim();
    return ABSENTA_APPS_REGISTRY.filter(app => 
      app.name.toLowerCase().includes(q) || 
      app.description.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleReturnToBeranda = () => {
    if (onBackToBeranda) {
      onBackToBeranda();
    } else {
      navigate('/dashboard?tab=ringkasan');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-24 sm:pb-10 max-w-7xl mx-auto px-1 sm:px-0">
      {/* ── MOBILE BREADCRUMB / RETURN ACTION ── */}
      <div className="flex items-center justify-between gap-2 sm:hidden pb-1">
        <button
          type="button"
          onClick={handleReturnToBeranda}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Beranda Guru</span>
        </button>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Portal Sekolah
        </span>
      </div>

      {/* ── APPS LAUNCHER CONTAINER (Clean Card, Zero Hero, Zero Category Filter) ── */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-6 md:p-8 shadow-sm space-y-4 sm:space-y-5">
        
        {/* Header Toolbar: Icon + Title + Apps Count + Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-black shadow-xs">
                A
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Aplikasi Sekolah
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:block">
                  Pusat layanan &amp; modul terpadu Absenta
                </p>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredApps.length} Aplikasi
            </span>
          </div>

          {/* Quick Search */}
          <div className="w-full sm:w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari aplikasi..."
              className="w-full pl-9 pr-7 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-blue-500/40 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs transition outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 3-Column on Mobile (matches Google Apps Launcher & Phone UI), scaling to 6 on Desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {filteredApps.map((app, index) => {
            const IconComponent = app.icon;
            return (
              <motion.button
                key={app.id}
                type="button"
                onClick={() => navigate(app.defaultPath)}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.12, delay: index * 0.015 }}
                className={cn(
                  "group relative flex flex-col items-center justify-start p-2.5 sm:p-4 md:p-5 rounded-2xl border transition-all duration-200 text-center cursor-pointer select-none touch-manipulation",
                  "bg-slate-50/70 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-800/90",
                  "border-slate-200/70 dark:border-slate-800/80 hover:border-blue-500/40 dark:hover:border-blue-400/40",
                  "hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                )}
              >
                {/* Category Micro Badge (Desktop hover) */}
                <span className="hidden sm:block absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                </span>

                {/* Squircle App Icon (Matches screenshot squircle style, responsive sizing) */}
                <div
                  className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-1.5 sm:mb-2.5 shadow-xs transition-transform duration-200 group-hover:scale-108 group-hover:shadow-md",
                    app.color.bg,
                    app.color.text
                  )}
                >
                  <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 stroke-[2.2]" />
                </div>

                {/* App Name */}
                <span className="text-[11px] sm:text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {app.name}
                </span>

                {/* Category Pill */}
                <span className="inline-block mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider truncate max-w-full">
                  {app.category}
                </span>

                {/* App Description (Desktop only) */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-snug hidden md:block">
                  {app.description}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredApps.length === 0 && (
          <div className="py-10 text-center text-slate-400 space-y-2">
            <LayoutGrid className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs sm:text-sm font-bold">Tidak ada aplikasi yang cocok dengan pencarian "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reset pencarian
            </button>
          </div>
        )}

        {/* Bottom Status Bar matching Google Launcher Popup Footer */}
        <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] sm:text-xs font-semibold text-slate-400 px-1">
          <span>{ABSENTA_APPS_REGISTRY.length} Aplikasi Tersedia</span>
          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
            <Sparkles className="w-3 h-3" />
            <span>Pusat Layanan Ekosistem</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default StaffPortalTab;
