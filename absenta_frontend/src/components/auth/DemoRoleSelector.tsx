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
  Search
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

  const filteredProfiles = useMemo(() => {
    let list = DEMO_ROLE_PROFILES;
    if (selectedCategory !== 'ALL') {
      list = list.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.simulatedName.toLowerCase().includes(q) ||
        p.badge.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  return (
    <div className="w-full space-y-3 select-none">
      {/* Header Demo Ringkas */}
      <div className="text-left space-y-1">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>1-Click Live Demo</span>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {filteredProfiles.length} Peran Tersedia
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
            placeholder="Cari nama jabatan / peran..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Category Pills Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-nowrap -mx-1 px-1">
          {DEMO_CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 border",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact List Peran (Super Simple & Fast) */}
      <div className="space-y-1.5 max-h-[380px] sm:max-h-[420px] overflow-y-auto custom-scrollbar pr-1 -mr-1">
        <AnimatePresence mode="popLayout">
          {filteredProfiles.map((profile, idx) => {
            const Icon = ICON_MAP[profile.iconName] || Crown;
            const isThisLoading = isLoading && activeLoadingRoleId === profile.id;

            return (
              <motion.div
                key={profile.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15, delay: Math.min(idx * 0.015, 0.2) }}
                onClick={() => !isLoading && onSelectRole(profile)}
                className={cn(
                  "group relative px-3 py-2 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer",
                  "bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs active:scale-[0.99]",
                  isThisLoading
                    ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/60 dark:bg-amber-950/40"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/20"
                )}
              >
                {/* Left: Avatar + Title & Name */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shadow-2xs bg-gradient-to-br transition-transform group-hover:scale-105 shrink-0",
                    profile.gradient
                  )}>
                    {isThisLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Icon size={16} className="stroke-[2.2]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 leading-tight">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                      {profile.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      {profile.simulatedName}
                    </p>
                  </div>
                </div>

                {/* Right: Badge & Arrow */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn(
                    "hidden sm:inline-block px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-tight border",
                    profile.badgeColor
                  )}>
                    {profile.badge}
                  </span>

                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-100 dark:group-hover:bg-amber-950 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
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
