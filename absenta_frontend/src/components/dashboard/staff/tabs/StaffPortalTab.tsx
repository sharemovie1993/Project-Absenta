// Absenta Pure Portal Launcher Component
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  Sparkles, 
  LayoutGrid, 
  ArrowUpRight, 
  LayoutDashboard,
  UserCircle,
  BookOpen,
  Shield,
  Building2,
  Globe,
  HeartHandshake,
  Users,
  Activity,
  Wrench,
  Award,
  Briefcase,
  ShieldCheck,
  FileText,
  Mail,
  Wallet,
  ShoppingCart,
  GraduationCap
} from 'lucide-react';
import { getVisibleApps, type AbsentaApp } from '@/config/absentaAppsRegistry';
import { 
  resolveUserDashboardTarget, 
  getUserStructuralActions,
  getUserCapabilities, 
  getUserPositionCodes,
  type StructuralPositionAction
} from '@/helpers/portalNavigationHelper';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const STRUCTURAL_ICON_MAP: Record<string, any> = {
  BookOpen,
  Shield,
  Building2,
  Globe,
  HeartHandshake,
  Users,
  Activity,
  Wrench,
  Award,
  Briefcase,
  ShieldCheck,
  FileText,
  Mail,
  Wallet,
  ShoppingCart,
  GraduationCap,
};

interface StaffPortalTabProps {
  onBackToBeranda?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const StaffPortalTab: React.FC<StaffPortalTabProps> = ({ 
  onBackToBeranda,
  onNavigateTab 
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const roleName = useMemo(() => {
    const raw = typeof user?.role === 'string' ? user.role : user?.role?.name || (user as any)?.roleName || '';
    return raw.toUpperCase();
  }, [user]);

  const isSiswa = roleName === 'SISWA' || roleName === 'STUDENT';

  const userCapabilities = useMemo(() => getUserCapabilities(user), [user]);
  const userPositions = useMemo(() => getUserPositionCodes(user), [user]);

  // Resolusi dashboard dasar (Beranda Guru, Dashboard Admin, Dashboard Siswa, dll.)
  const dashboardTarget = useMemo(() => resolveUserDashboardTarget(user), [user]);

  // Resolusi tombol jabatan struktural fungsional (Kurikulum, Kesiswaan, Sarpras, Hubin, BK, Wali Kelas, dll.)
  const structuralActions = useMemo(() => getUserStructuralActions(user), [user]);

  const visibleApps = useMemo(() => {
    return getVisibleApps(userCapabilities, [], roleName, userPositions);
  }, [userCapabilities, roleName, userPositions]);

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return visibleApps;
    const q = searchQuery.toLowerCase().trim();
    return visibleApps.filter(app => 
      app.name.toLowerCase().includes(q) || 
      app.description.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q)
    );
  }, [visibleApps, searchQuery]);

  const handleGoToPrimaryDashboard = () => {
    if (dashboardTarget.path) {
      navigate(dashboardTarget.path);
      return;
    }
    if (onNavigateTab) {
      onNavigateTab(dashboardTarget.tab);
    } else if (onBackToBeranda) {
      onBackToBeranda();
    } else {
      navigate(`/dashboard?tab=${dashboardTarget.tab}`);
    }
  };

  const handleGoToStructuralAction = (action: StructuralPositionAction) => {
    if (action.path) {
      navigate(action.path);
      return;
    }
    if (action.tab) {
      if (onNavigateTab) {
        onNavigateTab(action.tab);
      } else {
        navigate(`/dashboard?tab=${action.tab}`);
      }
    }
  };

  const handleGoToProfile = () => {
    if (onNavigateTab) {
      onNavigateTab('profil');
    } else {
      navigate('/dashboard?tab=profil');
    }
  };

  const handleAppClick = (app: AbsentaApp) => {
    // Navigasi kontekstual untuk siswa menuju tab dasbor mereka
    if (isSiswa) {
      if (app.id === 'attendance') {
        if (onNavigateTab) {
          onNavigateTab('kehadiran');
          return;
        }
        navigate('/dashboard?tab=kehadiran');
        return;
      }
      if (app.id === 'kesiswaan') {
        if (onNavigateTab) {
          onNavigateTab('catatan');
          return;
        }
        navigate('/dashboard?tab=catatan');
        return;
      }
      if (app.id === 'academic') {
        if (onNavigateTab) {
          onNavigateTab('profil');
          return;
        }
        navigate('/dashboard?tab=profil');
        return;
      }
    }
    navigate(app.defaultPath);
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-24 sm:pb-10 max-w-7xl mx-auto px-1 sm:px-0">
      
      {/* ── TOP NAV BAR: PURE PORTAL NAVIGATION STRIP ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-xs">
        
        {/* User Identity & Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Portal Absenta
              </span>
              <span className="hidden xs:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Hub Sentral
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[200px] xs:max-w-xs sm:max-w-sm">
              {user?.name || user?.full_name || 'Pengguna'} {userPositions.length > 0 && `• ${userPositions.join(' / ')}`}
            </p>
          </div>
        </div>

        {/* ── DYNAMIC 3-BUTTON ACTION GROUP ── */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          
          {/* Tombol 1: Beranda Guru / Dashboard Utama */}
          <button
            type="button"
            onClick={handleGoToPrimaryDashboard}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{dashboardTarget.label}</span>
          </button>

          {/* Tombol 2: Tombol Jabatan Struktural (Khusus yang memiliki SK Jabatan Struktural seperti Kurikulum, Kesiswaan, Sarpras, Hubin, BK, Wali Kelas) */}
          {structuralActions.map((action) => {
            const IconComponent = STRUCTURAL_ICON_MAP[action.iconName] || LayoutDashboard;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleGoToStructuralAction(action)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer",
                  action.colorClass
                )}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{action.label}</span>
              </button>
            );
          })}

          {/* Tombol 3: Profil Akun */}
          <button
            type="button"
            onClick={handleGoToProfile}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <UserCircle className="w-3.5 h-3.5" />
            <span>Profil</span>
          </button>
        </div>
      </div>

      {/* ── APPS LAUNCHER CONTAINER (Clean Pure Grid Launcher) ── */}
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
                onClick={() => handleAppClick(app)}
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
          <span>{filteredApps.length} Aplikasi Tersedia</span>
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
