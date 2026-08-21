import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronUp, 
  X, 
  Loader2, 
  LogOut,
  Compass,
  ArrowRight
} from 'lucide-react';
import { 
  DEMO_ROLE_PROFILES, 
  DEMO_CATEGORIES, 
  type DemoRoleProfile 
} from '@/config/demoProfiles.config';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export const FloatingDemoSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingRoleId, setSwitchingRoleId] = useState<string | null>(null);

  const { isAuthenticated, user, loginAction, logoutAction } = useAuthStore();

  const isDemoSession = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const isSessionDemo = sessionStorage.getItem('is_demo_session') === 'true';
    const isDemoDomain = window.location.hostname.toLowerCase().includes('demo');
    const isEnvDemo = String(import.meta.env.VITE_DEMO_MODE || '').toLowerCase() === 'true';
    return isSessionDemo || isDemoDomain || isEnvDemo;
  }, []);

  const activeRoleName = useMemo(() => {
    return sessionStorage.getItem('demo_active_role') || user?.role?.name || 'Demo User';
  }, [user]);

  const activePersonName = useMemo(() => {
    return sessionStorage.getItem('demo_active_name') || user?.name || '';
  }, [user]);

  const filteredProfiles = useMemo(() => {
    if (selectedCategory === 'ALL') return DEMO_ROLE_PROFILES;
    return DEMO_ROLE_PROFILES.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  if (!isAuthenticated || !isDemoSession) {
    return null;
  }

  const handleSwitchRole = async (profile: DemoRoleProfile) => {
    setIsSwitching(true);
    setSwitchingRoleId(profile.id);
    toast.loading(`Beralih ke peran ${profile.title}...`, { id: 'switch-demo' });

    try {
      // 1. Silent logout
      await logoutAction();

      // 2. Set new demo session data
      sessionStorage.setItem('is_demo_session', 'true');
      sessionStorage.setItem('demo_active_role', profile.title);
      sessionStorage.setItem('demo_active_name', profile.simulatedName);

      // 3. Login with target demo profile
      await loginAction(profile.email, profile.password || 'password123');
      toast.success(`Berhasil masuk sebagai ${profile.simulatedName} (${profile.title})!`, { id: 'switch-demo' });
      setIsOpen(false);
    } catch (err: any) {
      toast.error('Gagal beralih peran demo', { id: 'switch-demo' });
    } finally {
      setIsSwitching(false);
      setSwitchingRoleId(null);
    }
  };

  const handleExitDemo = async () => {
    sessionStorage.removeItem('is_demo_session');
    sessionStorage.removeItem('demo_active_role');
    sessionStorage.removeItem('demo_active_name');
    await logoutAction();
  };

  return (
    <>
      {/* Floating Action Pill at Bottom-Right */}
      <aside aria-label="Demo Role Switcher" className="fixed bottom-5 right-5 z-[9998] flex items-center gap-2">
        <motion.button
          type="button"
          aria-label="Buka switcher peran demo"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-2xl backdrop-blur-md border border-slate-700/50 dark:border-slate-300/50 cursor-pointer group"
        >
          <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px] shrink-0 animate-pulse">
            <Sparkles size={11} />
          </div>

          <div className="flex flex-col text-left leading-tight pr-1">
            <span className="text-[9px] font-bold text-amber-300 dark:text-amber-600 uppercase tracking-widest">
              Mode Demo
            </span>
            <span className="text-xs font-black truncate max-w-[140px] sm:max-w-[180px]">
              {activePersonName ? `${activePersonName} (${activeRoleName})` : activeRoleName}
            </span>
          </div>

          <ChevronUp className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
        </motion.button>
      </aside>

      {/* Popover Modal Selector */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Beralih Peran Demo (1-Click)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Pilih peran di bawah untuk langsung mencoba antarmuka peran lain seketika.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Category Pills Switcher */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5 flex-nowrap shrink-0">
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
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        )}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Grid Profiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto custom-scrollbar p-1 flex-1">
                  {filteredProfiles.map((profile) => {
                    const isThisCurrent = activeRoleName.toLowerCase().includes(profile.title.toLowerCase()) || activeRoleName.toLowerCase().includes(profile.roleCode.toLowerCase());
                    const isThisLoading = isSwitching && switchingRoleId === profile.id;

                    return (
                      <button
                        key={profile.id}
                        type="button"
                        disabled={isSwitching}
                        onClick={() => handleSwitchRole(profile)}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3 cursor-pointer group",
                          "bg-white dark:bg-slate-900/90 hover:shadow-md",
                          isThisCurrent
                            ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/40 dark:bg-amber-950/20"
                            : "border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shadow-xs bg-gradient-to-br transition-transform group-hover:scale-105 shrink-0 mt-0.5",
                          profile.gradient
                        )}>
                          {isThisLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              {profile.title}
                            </h4>
                            {isThisCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-amber-500 text-white shrink-0">
                                Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                            {profile.simulatedName}
                          </p>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {profile.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer Exit Demo */}
                <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Demo Platform Absenta • Calon Pembeli
                  </span>
                  <button
                    type="button"
                    onClick={handleExitDemo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar dari Demo</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

FloatingDemoSwitcher.displayName = 'FloatingDemoSwitcher';
