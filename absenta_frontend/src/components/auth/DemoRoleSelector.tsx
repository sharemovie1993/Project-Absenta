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
  LayoutGrid
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

  // Kelompokkan peran berdasarkan kategori (App Launcher Clusters)
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
    <div className="w-full space-y-3.5 select-none">
      {/* Header Demo Ringkas */}
      <div className="text-left space-y-1">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click App Launcher Demo</span>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {totalCount} Peran Tersedia
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
          Pilih Peran & Langsung Masuk
        </h2>
      </div>

      {/* Search Bar & Kategori */}
      <div className="space-y-2">
        {/* Compact Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama peran, jabatan, atau nama pengguna..."
            className="w-full pl-8 pr-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Category Pills Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-nowrap -mx-1 px-1">
          {DEMO_CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 border",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs scale-[1.02]"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* App Launcher Clustered Container */}
      <div className="space-y-4 max-h-[440px] sm:max-h-[480px] overflow-y-auto custom-scrollbar pr-1.5 -mr-1.5">
        <AnimatePresence mode="popLayout">
          {clusteredProfiles.map((group) => (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-2"
            >
              {/* Cluster Section Header */}
              <div className="flex items-center justify-between px-1 py-0.5 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                    {group.label}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {group.profiles.length}
                  </span>
                </div>
              </div>

              {/* Grid Cards inside Cluster (Model App Launcher) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.profiles.map((profile) => {
                  const Icon = ICON_MAP[profile.iconName] || Crown;
                  const isThisLoading = isLoading && activeLoadingRoleId === profile.id;

                  return (
                    <motion.div
                      key={profile.id}
                      layout
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => !isLoading && onSelectRole(profile)}
                      className={cn(
                        "group relative p-2.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-2 cursor-pointer select-none",
                        "bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500/80",
                        isThisLoading
                          ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/70 dark:bg-amber-950/40"
                          : "border-slate-200/80 dark:border-slate-800 hover:bg-gradient-to-br hover:from-amber-50/20 hover:to-transparent"
                      )}
                    >
                      {/* Card Header: Icon + Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shadow-xs bg-gradient-to-br transition-transform group-hover:scale-105 shrink-0",
                          profile.gradient
                        )}>
                          {isThisLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <Icon size={18} className="stroke-[2.2]" />
                          )}
                        </div>

                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight border truncate max-w-[140px]",
                          profile.badgeColor
                        )}>
                          {profile.badge}
                        </span>
                      </div>

                      {/* Card Body: Title & Simulated Person Name */}
                      <div className="space-y-0.5 min-w-0 flex-1 text-left">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                          {profile.title}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {profile.simulatedName}
                        </p>
                      </div>

                      {/* Card Footer: Quick Action Indicator */}
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] font-bold text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        <span className="flex items-center gap-1">
                          <LayoutGrid className="w-3 h-3" />
                          <span>1-Klik Masuk</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {clusteredProfiles.length === 0 && (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs font-bold text-slate-500">Tidak ada peran yang cocok dengan "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
              className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
            >
              Reset Pencarian
            </button>
          </div>
        )}
      </div>

      {/* Footer Switcher back to Manual Login */}
      {onToggleManualLogin && (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={onToggleManualLogin}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer py-1"
          >
            <KeyRound className="w-3 h-3" />
            <span>Gunakan Login Manual (NIP / Password)</span>
          </button>
        </div>
      )}
    </div>
  );
});

DemoRoleSelector.displayName = 'DemoRoleSelector';
