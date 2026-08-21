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
  ArrowRight,
  Loader2,
  KeyRound,
  Compass
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

  const filteredProfiles = useMemo(() => {
    if (selectedCategory === 'ALL') return DEMO_ROLE_PROFILES;
    return DEMO_ROLE_PROFILES.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="w-full space-y-4 select-none">
      {/* Header Demo Portal */}
      <div className="text-center sm:text-left space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-300/40 dark:border-amber-700/40 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-1">
          <Compass className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
          <span>Eksplorasi Demo Interaktif</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Pilih Peran & Jabatan
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          Ketuk salah satu peran di bawah untuk langsung masuk dan mencoba antarmuka tanpa mengetik password.
        </p>
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
                "px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 border",
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs scale-100"
                  : "bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Bento Grid Profiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] sm:max-h-[420px] overflow-y-auto custom-scrollbar p-1 -mx-1">
        <AnimatePresence mode="popLayout">
          {filteredProfiles.map((profile, idx) => {
            const Icon = ICON_MAP[profile.iconName] || Crown;
            const isThisLoading = isLoading && activeLoadingRoleId === profile.id;

            return (
              <motion.div
                key={profile.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                onClick={() => !isLoading && onSelectRole(profile)}
                className={cn(
                  "group relative p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between text-left cursor-pointer",
                  "bg-white dark:bg-slate-900/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5",
                  isThisLoading
                    ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                )}
              >
                {/* Top Row: Icon + Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
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
                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight border shrink-0 line-clamp-1",
                    profile.badgeColor
                  )}>
                    {profile.badge}
                  </span>
                </div>

                {/* Role Title & Simulated Name */}
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                    {profile.title}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                    {profile.simulatedName}
                  </p>
                </div>

                {/* Brief Capabilities */}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-1.5 font-medium leading-relaxed">
                  {profile.description}
                </p>

                {/* Bottom Action Hint */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                  <span>{isThisLoading ? 'Menghubungkan...' : '1-Click Masuk'}</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer Switcher back to Manual Login */}
      {onToggleManualLogin && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onToggleManualLogin}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer py-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Gunakan Login Manual dengan Email / NIP</span>
          </button>
        </div>
      )}
    </div>
  );
});

DemoRoleSelector.displayName = 'DemoRoleSelector';
