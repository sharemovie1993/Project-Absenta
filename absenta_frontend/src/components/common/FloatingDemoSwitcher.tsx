import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronUp, 
  X, 
  Loader2, 
  LogOut,
  Compass,
  Search,
  ChevronRight,
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
  Smartphone
} from 'lucide-react';
import { 
  DEMO_ROLE_PROFILES, 
  DEMO_CATEGORIES, 
  type DemoRoleProfile 
} from '@/config/demoProfiles.config';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

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

export const FloatingDemoSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingRoleId, setSwitchingRoleId] = useState<string | null>(null);

  const { isAuthenticated, user, loginAction, logout } = useAuthStore();

  const isDemoSession = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const isSessionDemo = sessionStorage.getItem('is_demo_session') === 'true';
    const isDemoDomain = window.location.hostname.toLowerCase().includes('demo');
    const isEnvDemo = String(import.meta.env.VITE_DEMO_MODE || '').toLowerCase() === 'true';
    return isSessionDemo || isDemoDomain || isEnvDemo;
  }, []);

  const activeRoleName = useMemo(() => {
    const sessionRole = sessionStorage.getItem('demo_active_role');
    if (sessionRole) return sessionRole;
    return user?.role?.name || 'Demo User';
  }, [user]);

  const activePersonName = useMemo(() => {
    const sessionName = sessionStorage.getItem('demo_active_name');
    if (sessionName) return sessionName;
    return user?.full_name || 'Pengguna Demo';
  }, [user]);

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

  if (!isAuthenticated || !isDemoSession) {
    return null;
  }

  const handleSwitchRole = async (profile: DemoRoleProfile) => {
    setIsSwitching(true);
    setSwitchingRoleId(profile.id);
    toast.loading(`Beralih ke peran ${profile.title}...`, { id: 'switch-demo' });

    try {
      const isDevMode = String(import.meta.env.VITE_DEV_MODE || '').toLowerCase() === 'true' && import.meta.env.MODE !== 'production';
      const isLocalhostLogin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const currentTenantId = localStorage.getItem('tenant_id') || undefined;
      const devTenantArg = (isDevMode && isLocalhostLogin) ? currentTenantId : undefined;

      // 1. Silent logout
      logout();

      // 2. Set new demo session data
      sessionStorage.setItem('is_demo_session', 'true');
      sessionStorage.setItem('demo_active_role', profile.title);
      sessionStorage.setItem('demo_active_name', profile.simulatedName);

      // 3. Login with target demo profile
      await loginAction(profile.email, profile.password || 'password123', devTenantArg);
      toast.success(`Berhasil masuk sebagai ${profile.simulatedName} (${profile.title})!`, { id: 'switch-demo' });
      setIsOpen(false);

      // 4. Clean Redirect to target dashboard
      let targetPath = '/dashboard';
      if (profile.roleCode === 'SISWA' || profile.category === 'STUDENT') {
        targetPath = '/student/dashboard';
      } else if (profile.roleCode === 'ORANG_TUA') {
        targetPath = '/parent-app';
      }

      window.location.href = targetPath;
    } catch (err: any) {
      toast.error('Gagal beralih peran demo: ' + (err?.response?.data?.message || err?.message || 'Terjadi kesalahan'), { id: 'switch-demo' });
      setIsSwitching(false);
      setSwitchingRoleId(null);
    }
  };

  const handleExitDemo = async () => {
    sessionStorage.removeItem('is_demo_session');
    sessionStorage.removeItem('demo_active_role');
    sessionStorage.removeItem('demo_active_name');
    logout();
    window.location.href = '/login';
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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                        Beralih Peran Demo (1-Click)
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Pilih peran untuk langsung mencoba antarmuka tanpa logout.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Bar & Category Switcher */}
                <div className="space-y-2 py-2">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari jabatan / nama..."
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
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          )}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Compact List Peran */}
                <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 -mr-1 flex-1 max-h-[360px]">
                  {filteredProfiles.map((profile) => {
                    const Icon = ICON_MAP[profile.iconName] || Crown;
                    const isThisCurrent = activeRoleName.toLowerCase().includes(profile.title.toLowerCase()) || activeRoleName.toLowerCase().includes(profile.roleCode.toLowerCase());
                    const isThisLoading = isSwitching && switchingRoleId === profile.id;

                    return (
                      <button
                        key={profile.id}
                        type="button"
                        disabled={isSwitching}
                        onClick={() => handleSwitchRole(profile)}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer",
                          "bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs active:scale-[0.99]",
                          isThisLoading
                            ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/60 dark:bg-amber-950/40"
                            : isThisCurrent
                            ? "ring-1 ring-amber-500/80 border-amber-400 bg-amber-50/30 dark:bg-amber-950/20"
                            : "border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/20"
                        )}
                      >
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
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {profile.title}
                              </h4>
                              {isThisCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-amber-500 text-white shrink-0">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                              {profile.simulatedName}
                            </p>
                          </div>
                        </div>

                        <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer Exit Demo */}
                <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Demo Platform Absenta • Calon Pembeli
                  </span>
                  <button
                    type="button"
                    onClick={handleExitDemo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
