import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import { Lock, LayoutGrid } from 'lucide-react';
import { useNavStore } from '../../store/navStore';
import { cn } from '../../lib/utils';
import Tooltip from '../ui/Tooltip';
import { type SidebarMenuItem as BackendMenuItem } from '@/api/menu.api';
import { useAuthStore } from '@/store/authStore';
import { MASTER_HUBS, getHubByLabel, type HubConfig } from '@/config/navigation.config';

interface HubSwitcherProps {
  isSidebarOpen: boolean;
  menuTree?: BackendMenuItem[];
}

export function HubSwitcher({ isSidebarOpen, menuTree = [] }: HubSwitcherProps) {
  const { activeHub, setActiveHub } = useNavStore();
  const { user, subscription } = useAuthStore();
  const location = useLocation();
  const isDashboardActive = location.pathname === '/dashboard';

  const isPlatformUser = useMemo(() => {
    const roleName = String(user?.role?.name || '').toUpperCase();
    return roleName === 'SUPERADMIN' || roleName.startsWith('PLATFORM_') || user?.tenant_id === 'system';
  }, [user]);

  // Set of hub IDs yang AKTIF berdasarkan menuTree dari backend.
  // Hub yang tidak ada di sini = belum subscribe / terkunci.
  const unlockedHubIds = useMemo(() => {
    return new Set(
      menuTree.map(node => getHubByLabel(node.name)).filter(Boolean)
    );
  }, [menuTree]);

  // Aturan: HubSwitcher selalu menampilkan SEMUA hub sebagai etalase platform.
  // Platform user (superadmin) tidak punya HubSwitcher tenant.
  const visibleHubs = useMemo((): HubConfig[] => {
    if (isPlatformUser) return [];
    return MASTER_HUBS;
  }, [isPlatformUser]);

  if (visibleHubs.length === 0) return null;

  return (
    <div className="px-3 py-4 space-y-3 mb-2 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-t-xl">
      {isSidebarOpen && (
        <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
          <LayoutGrid size={12} /> Pilih Modul
        </div>
      )}
      {isSidebarOpen ? (
        <div className="grid grid-cols-2 gap-2 px-1">
          {/* Dashboard Global Button */}
          <Link
            to="/dashboard"
            aria-label="Buka Dashboard Global"
            className={cn(
              "col-span-2 flex items-center justify-center lg:justify-start gap-2 px-3 py-2 rounded-xl transition-all duration-200 border",
              isDashboardActive
                ? "bg-slate-700 dark:bg-slate-600 text-white border-transparent shadow-md"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 shadow-sm"
            )}
          >
            <LayoutGrid size={14} className={cn("flex-shrink-0", isDashboardActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
            <span className="text-[10px] font-black uppercase tracking-wider truncate">
              Dashboard Global
            </span>
          </Link>

          {visibleHubs.map((hub, index) => {
            const isActive = activeHub === hub.id;
            const isUnlocked = true; // Always unlocked for showcase in HubSwitcher
            const Icon = hub.icon;
            // Item terakhir ganjil → full width
            const isLastOdd = index === visibleHubs.length - 1 && visibleHubs.length % 2 !== 0;

            return (
              <button
                key={hub.id}
                onClick={() => setActiveHub(hub.id)}
                aria-label={`Pindah ke modul ${hub.label}`}
                aria-pressed={isActive}
                title={hub.label}
                className={cn(
                  "relative flex items-center justify-center lg:justify-start gap-2 px-3 py-2 rounded-xl transition-all duration-200 border",
                  isLastOdd && "col-span-2",
                  isActive
                    ? cn(hub.solidBg, "text-white border-transparent shadow-md")
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 shadow-sm"
                )}
              >
                <Icon
                  size={14}
                  className={cn(
                    "flex-shrink-0",
                    isActive ? "text-white" : hub.color
                  )}
                />
                <span className="text-[10px] font-black uppercase tracking-wider truncate">
                  {hub.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* ── Collapsed Sidebar (icon only) ── */
        <div className="flex flex-col items-center gap-3">
          {/* Dashboard Global Icon Button */}
          <Tooltip content="Dashboard Global" placement="right">
            <Link
              to="/dashboard"
              aria-label="Buka Dashboard Global"
              className={cn(
                "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                isDashboardActive
                  ? "bg-slate-700 dark:bg-slate-600 text-white shadow-lg scale-110"
                  : "bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-gray-100"
              )}
            >
              <LayoutGrid size={20} />
              {isDashboardActive && (
                <motion.div
                  layoutId="activeHubDot"
                  className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white rounded-full"
                />
              )}
            </Link>
          </Tooltip>

          {visibleHubs.map((hub) => {
            const isActive = activeHub === hub.id;
            const isUnlocked = true; // Always unlocked for showcase in HubSwitcher
            const Icon = hub.icon;
            return (
              <Tooltip
                key={hub.id}
                content={hub.label}
                placement="right"
              >
                <button
                  onClick={() => setActiveHub(hub.id)}
                  aria-label={`Pindah ke modul ${hub.label}`}
                  aria-pressed={isActive}
                  className={cn(
                    "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                    isActive
                      ? cn(hub.solidBg, "text-white shadow-lg scale-110")
                      : "bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-gray-100"
                  )}
                >
                  <Icon 
                    size={20} 
                    className={cn(
                      isActive ? "text-white" : hub.color
                    )}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="activeHubDot"
                      className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white rounded-full"
                    />
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
