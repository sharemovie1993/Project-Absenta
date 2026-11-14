import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Home, Sparkles, ExternalLink, LayoutDashboard, Users, Archive, BookOpen, Shield, Sliders, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { ABSENTA_APPS_REGISTRY, getVisibleApps, getActiveApp, type AbsentaApp } from '@/config/absentaAppsRegistry';
import { getUserPositionCodes } from '@/helpers/portalNavigationHelper';
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

  const userPositions = useMemo(() => getUserPositionCodes(user), [user]);
  const isSuperAdmin = useMemo(() => isSystemSuperAdmin(user?.role, user?.tenant_id), [user?.role, user?.tenant_id]);

  const visibleApps = useMemo<AbsentaApp[]>(() => {
    if (isSuperAdmin) {
      return [
        {
          id: 'platform-dashboard',
          name: 'Ringkasan',
          description: 'Platform Intelligence & Analytics',
          icon: LayoutDashboard,
          iconName: 'LayoutDashboard',
          color: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', badge: '', hover: '', gradient: '' },
          defaultPath: '/dashboard',
          pathPrefixes: ['/dashboard', '/superadmin/intelligence'],
          category: 'PLATFORM',
        },
        {
          id: 'platform-tenants',
          name: 'Kelola Tenant',
          description: 'Manajemen Sekolah & Langganan',
          icon: Users,
          iconName: 'Users',
          color: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', badge: '', hover: '', gradient: '' },
          defaultPath: '/tenants',
          pathPrefixes: ['/tenants'],
          category: 'PLATFORM',
        },
        {
          id: 'platform-backups',
          name: 'Cadangan',
          description: 'Backup, Restore & Smart Clone',
          icon: Archive,
          iconName: 'Archive',
          color: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', badge: '', hover: '', gradient: '' },
          defaultPath: '/superadmin/backups',
          pathPrefixes: ['/superadmin/backups'],
          category: 'INFRASTRUKTUR',
        },
        {
          id: 'platform-presets',
          name: 'Preset Mapel',
          description: 'Master Kurikulum & Preset Global',
          icon: BookOpen,
          iconName: 'BookOpen',
          color: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', badge: '', hover: '', gradient: '' },
          defaultPath: '/superadmin/mapel-presets',
          pathPrefixes: ['/superadmin/mapel-presets', '/superadmin/topik-presets', '/superadmin/jurusan-presets'],
          category: 'PRESET',
        },
        {
          id: 'platform-roles',
          name: 'Hak Akses',
          description: 'Role & Capability Matrix',
          icon: Shield,
          iconName: 'Shield',
          color: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', badge: '', hover: '', gradient: '' },
          defaultPath: '/management/roles',
          pathPrefixes: ['/management/roles'],
          category: 'SECURITY',
        },
        {
          id: 'platform-menus',
          name: 'Kelola Menu',
          description: 'Navigasi Sidebar & RBAC',
          icon: Sliders,
          iconName: 'Sliders',
          color: { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', badge: '', hover: '', gradient: '' },
          defaultPath: '/management/menus',
          pathPrefixes: ['/management/menus'],
          category: 'SECURITY',
        },
        {
          id: 'platform-support',
          name: 'Support',
          description: 'Tiket Bantuan Sekolah',
          icon: MessageSquare,
          iconName: 'MessageSquare',
          color: { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', badge: '', hover: '', gradient: '' },
          defaultPath: '/support',
          pathPrefixes: ['/support'],
          category: 'SUPPORT',
        },
      ];
    }
    return getVisibleApps(userCapabilities, activeFeatures, roleName, userPositions);
  }, [isSuperAdmin, userCapabilities, activeFeatures, roleName, userPositions]);

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
        aria-label="Pusat Modul & Aplikasi (Pintasan Halaman Utama Tiap Modul)"
        title="Pusat Modul & Aplikasi (Pintasan Halaman Utama Tiap Modul)"
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

      {/* Google-Style Apps Popover Panel (Native CSS Transitions) */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 sm:hidden animate-in fade-in duration-150"
          />

          <div
            className="fixed inset-x-3 top-[68px] sm:absolute sm:inset-auto sm:right-0 sm:top-12 z-50 w-auto sm:w-[380px] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden p-3.5 sm:p-4 animate-in fade-in zoom-in-95 duration-150"
          >
              {/* Header / Home Portal Shortcut */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800/80 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0">
                    A
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block leading-tight">
                      Pusat Modul & Aplikasi
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block leading-tight mt-0.5">
                      Pintasan melihat halaman utama tiap modul
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <Home className="h-3 w-3" />
                  <span>Beranda</span>
                </button>
              </div>

              {/* 3-Column Apps Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-h-[60vh] sm:max-h-[380px] overflow-y-auto overscroll-contain p-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {visibleApps.map((app) => {
                  const IconComponent = app.icon;
                  const isCurrentActive = isSuperAdmin
                    ? app.pathPrefixes.some(p => location.pathname.toLowerCase().startsWith(p.toLowerCase()))
                    : currentApp?.id === app.id;

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
                <span>{visibleApps.length} Modul Utama</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  Pintasan Cepat Modul
                </span>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
export default AppLauncherDropdown;
