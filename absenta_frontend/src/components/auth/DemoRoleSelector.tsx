import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  BookOpen, 
  Users, 
  Briefcase, 
  Building2, 
  FileText, 
  HeartHandshake, 
  Laptop, 
  ShoppingCart, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Sparkles, 
  Smartphone,
  ChevronRight,
  Loader2,
  KeyRound,
  Search,
  CheckCircle2,
  Compass,
  School
} from 'lucide-react';
import { 
  DEMO_ROLE_PROFILES, 
  DEMO_CATEGORIES, 
  type DemoRoleProfile 
} from '@/config/demoProfiles.config';
import { cn } from '@/lib/utils';

interface DemoRoleSelectorProps {
  onSelectRole: (profile: DemoRoleProfile) => void;
  isLoading: boolean;
  activeLoadingRoleId?: string | null;
  onToggleManualLogin?: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string; size?: number }>> = {
  Crown,
  BookOpen,
  Users,
  Briefcase,
  Building2,
  FileText,
  HeartHandshake,
  Laptop,
  ShoppingCart,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Sparkles,
  Smartphone,
};

export const DemoRoleSelector: React.FC<DemoRoleSelectorProps> = React.memo(({
  onSelectRole,
  isLoading,
  activeLoadingRoleId,
  onToggleManualLogin
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Kelompokkan peran berdasarkan kategori (Model Bento Klaster App Launcher)
  const clusteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // Filter kategori yang aktif
    const targetCategories = selectedCategory === 'ALL' 
      ? DEMO_CATEGORIES.filter(c => c.id !== 'ALL')
      : DEMO_CATEGORIES.filter(c => c.id === selectedCategory);

    return targetCategories.map(cat => {
      let profiles = DEMO_ROLE_PROFILES.filter(p => p.category === cat.id);
      
      if (query) {
        profiles = profiles.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.simulatedName.toLowerCase().includes(query) ||
          p.badge.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        );
      }

      return {
        ...cat,
        profiles
      };
    }).filter(group => group.profiles.length > 0);
  }, [selectedCategory, searchQuery]);

  const totalCount = useMemo(() => {
    return clusteredProfiles.reduce((acc, curr) => acc + curr.profiles.length, 0);
  }, [clusteredProfiles]);

  return (
    <div className="w-full space-y-6 select-none">
      {/* ── Top Bar Kontrol: Filter Kategori & Search Bar (Modern Dashboard Header) ── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Pusat Peluncur Peran Demo
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                1-Click Access
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Pilih peran di bawah ini untuk langsung masuk dan menguji alur kerja secara instan.
            </p>
          </div>
        </div>

        {/* Right: Search & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex items-center min-w-[240px] sm:min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari peran, jabatan, atau pengguna..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {onToggleManualLogin && (
            <button
              type="button"
              onClick={onToggleManualLogin}
              className="px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Login Manual</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 flex-nowrap -mx-1 px-1">
        {DEMO_CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 border",
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm scale-[1.02]"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── BENTO KLASTER WORKFLOW GRID (Dipisah Per Kartu Kontainer Besar ala Workspace Dashboard) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {clusteredProfiles.map((group, groupIdx) => (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, delay: groupIdx * 0.05 }}
              className="p-5 sm:p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              {/* Header Kartu Klaster */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                    {group.label}
                  </h3>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {group.profiles.length} Peran
                </span>
              </div>

              {/* Grid 4-Kolom Squircles App Icons (Apple / Web Portal Style) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-2 sm:gap-x-3 pt-4 flex-1 items-start">
                {group.profiles.map((profile) => {
                  const Icon = ICON_MAP[profile.iconName] || Crown;
                  const isThisLoading = isLoading && activeLoadingRoleId === profile.id;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => onSelectRole(profile)}
                      className={cn(
                        "group flex flex-col items-center text-center p-2 rounded-2xl transition-all duration-200 cursor-pointer relative",
                        "hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-95",
                        isThisLoading && "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/40"
                      )}
                    >
                      {/* Squircle App Tile Icon (Mewah & Berkelas) */}
                      <div className={cn(
                        "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-[1.25rem] flex items-center justify-center shadow-md shadow-slate-200/50 dark:shadow-none bg-gradient-to-br transition-all duration-200 group-hover:scale-108 group-hover:shadow-lg shrink-0 mb-2 relative overflow-hidden border",
                        profile.gradient,
                        profile.border
                      )}>
                        {isThisLoading ? (
                          <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-white" />
                        ) : (
                          <Icon size={26} className="stroke-[2.2] drop-shadow-xs" />
                        )}

                        {/* Top-Right Mini Badge / Status Dot */}
                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white/70 shadow-xs" />
                      </div>

                      {/* Label Judul Jabatan (Tebal & Rapi) */}
                      <span className="text-[11.5px] sm:text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-tight max-w-[110px] text-center">
                        {profile.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {clusteredProfiles.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <p className="text-sm font-bold text-slate-500">Tidak ada peran yang cocok dengan kata kunci "{searchQuery}"</p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-md hover:bg-amber-600 cursor-pointer"
          >
            Tampilkan Semua Peran
          </button>
        </div>
      )}
    </div>
  );
});

DemoRoleSelector.displayName = 'DemoRoleSelector';
