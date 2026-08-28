import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Home, Sparkles, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ABSENTA_APPS_REGISTRY, getVisibleApps, getActiveApp, type AbsentaApp } from '@/config/absentaAppsRegistry';
import { cn } from '@/lib/utils';

export function AppLauncherDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, subscription } = useAuthStore();

  const roleName = user?.role?.name || (typeof user?.role === 'string' ? user.role : (user as any)?.roleName) || '';
  const userCapabilities = useMemo(() => {
    if (Array.isArray(user?.capabilities)) return user.capabilities;
    if (typeof user?.capabilities === 'string') {
      try { return JSON.parse(user.capabilities); } catch { return (user.capabilities as string).split(','); }
    }
    return [];
  }, [user?.capabilities]);

  const activeFeatures = useMemo(() => {
    if (Array.isArray(subscription?.features)) return subscription.features;
    return ['CORE', 'ABSENSI', 'BPBK', 'WHATSAPP_SERVICE', 'KEUANGAN', 'SARPRAS', 'HUBIN'];
  }, [subscription?.features]);

  const visibleApps = useMemo(() => {
    return getVisibleApps(userCapabilities, activeFeatures, roleName);
  }, [userCapabilities, activeFeatures, roleName]);

  const currentApp = useMemo(() => {
    return getActiveApp(location.pathname);
  }, [location.pathname]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleSelectApp = (app: AbsentaApp) => {
    setIsOpen(false);
    navigate(app.defaultPath);
  };

  const handleGoHome = () => {
    setIsOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 9-Dots Waffle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Aplikasi Sekolah"
        title="Aplikasi Sekolah"
        className={cn(
          "h-10 w-10 flex items-center justify-center rounded-full transition-all duration-200 outline-none",
          isOpen
            ? "bg-slate-200/80 dark:bg-slate-700/80 text-blue-600 dark:text-blue-400 shadow-inner"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        {/* Custom 9-Dots Grid Icon */}
        <div className="grid grid-cols-3 gap-[3px] p-1.5 pointer-events-none">
          {[...Array(9)].map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-[4.5px] w-[4.5px] rounded-[1px] transition-colors",
                isOpen
                  ? "bg-blue-600 dark:bg-blue-400"
                  : "bg-slate-600 dark:bg-slate-300 group-hover:bg-slate-900 dark:group-hover:bg-white"
              )}
            />
          ))}
        </div>
      </button>

      {/* Google-Style Apps Popover Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 sm:hidden"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed inset-x-3 top-[68px] sm:absolute sm:inset-auto sm:right-0 sm:top-12 z-50 w-auto sm:w-[380px] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden p-3.5 sm:p-4"
            >
              {/* Header / Home Portal Shortcut */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800/80 px-1">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black shadow-xs">
                    A
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Aplikasi Sekolah
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Beranda Portal</span>
                </button>
              </div>

              {/* 3-Column Apps Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-h-[60vh] sm:max-h-[380px] overflow-y-auto overscroll-contain p-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {visibleApps.map((app) => {
                  const IconComponent = app.icon;
                  const isCurrentActive = currentApp?.id === app.id;

                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleSelectApp(app)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all duration-200 text-center outline-none cursor-pointer",
                        isCurrentActive
                          ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 shadow-xs"
                          : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent active:scale-95"
                      )}
                    >
                      {/* App Icon Container */}
                      <div
                        className={cn(
                          "h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center mb-1.5 sm:mb-2 shadow-xs transition-transform duration-200 group-hover:scale-105 group-hover:shadow-md",
                          app.color.bg,
                          app.color.text
                        )}
                      >
                        <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
                      </div>

                      {/* App Name */}
                      <span
                        className={cn(
                          "text-[11px] sm:text-xs font-semibold truncate w-full tracking-tight",
                          isCurrentActive
                            ? "text-blue-700 dark:text-blue-300 font-bold"
                            : "text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white"
                        )}
                      >
                        {app.name}
                      </span>

                      {/* Active Pip */}
                      {isCurrentActive && (
                        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer Summary */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
                <span>{visibleApps.length} Aplikasi Tersedia</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  Pusat Layanan
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
export default AppLauncherDropdown;
