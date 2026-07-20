import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Lock, LayoutGrid } from 'lucide-react';
import { useNavStore } from '../../store/navStore';
import { cn } from '../../lib/utils';
import Tooltip from '../ui/Tooltip';
import { type SidebarMenuItem as BackendMenuItem } from '@/api/menu.api';
import { useAuth } from '@/hooks/useAuth';
import { 
  MASTER_HUBS, 
  getHubByLabel, 
  type HubConfig, 
  resolveUserWorkspaces,
  ROLE_WORKSPACES 
} from '@/config/navigation.config';

interface HubSwitcherProps {
  isSidebarOpen: boolean;
  menuTree?: BackendMenuItem[];
}

export function HubSwitcher({ isSidebarOpen, menuTree = [] }: HubSwitcherProps) {
  const { activeHub, setActiveHub, activeWorkspaceId, setActiveWorkspaceId } = useNavStore();
  const { user, can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboardActive = location.pathname === '/dashboard';

  const isAdmin = useMemo(() => {
    const roleName = String(user?.role?.name || '').toUpperCase();
    return roleName === 'ADMIN' || roleName === 'SUPERADMIN' || roleName.startsWith('PLATFORM_') || user?.tenant_id === 'system';
  }, [user]);

  const userWorkspaces = useMemo(() => {
    return resolveUserWorkspaces(user, can);
  }, [user, can]);

  const handleHubClick = (hubId: any) => {
    setActiveHub(hubId);
    const paths: Record<string, string> = {
      'AKADEMIK': '/academic',
      'KURIKULUM': '/kurikulum/dashboard',
      'KESISWAAN': '/kesiswaan/monitoring',
      'SARPRAS': '/sarpras/dashboard',
      'HUBIN': '/hubin/dashboard',
      'BPBK': '/bpbk/dashboard',
      'KOPERASI': '/cooperative/dashboard',
      'ABSENSI': '/attendance/dashboard',
      'PERSURATAN': '/correspondence/dashboard',
      'RAPOR': '/rapor/dashboard',
      'CBT': '/cbt/dashboard'
    };
    if (paths[hubId]) {
      navigate(paths[hubId]);
    }
  };

  const visibleHubs = useMemo((): HubConfig[] => {
    if (!isAdmin) return [];
    return MASTER_HUBS;
  }, [isAdmin]);

  // Non-Admin Workspace Mode
  if (!isAdmin) {
    if (userWorkspaces.length === 0) return null;

    return (
      <div className="px-3 py-4 space-y-3 mb-2 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-t-xl">
        {isSidebarOpen && (
          <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
            <LayoutGrid size={12} /> Peran & Mode Kerja
          </div>
        )}
        {isSidebarOpen ? (
          <div className="flex flex-col gap-2 px-1">
            {userWorkspaces.map((ws) => {
              const isActive = activeWorkspaceId === ws.id;
              const Icon = ws.icon;
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    navigate(ws.defaultPath);
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 border text-left",
                    isActive
                      ? cn(ws.solidBg, "text-white border-transparent shadow-md")
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={16} className={cn("shrink-0", isActive ? "text-white" : ws.color)} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">{ws.label}</p>
                      <p className={cn("text-[10px] truncate mt-0.5", isActive ? "text-white/80" : "text-slate-400")}>{ws.desc}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ml-2",
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  )}>
                    {ws.badge}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {userWorkspaces.map((ws) => {
              const isActive = activeWorkspaceId === ws.id;
              const Icon = ws.icon;
              return (
                <Tooltip key={ws.id} content={ws.label} placement="right">
                  <button
                    onClick={() => {
                      setActiveWorkspaceId(ws.id);
                      navigate(ws.defaultPath);
                    }}
                    className={cn(
                      "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                      isActive
                        ? cn(ws.solidBg, "text-white shadow-lg scale-110")
                        : "bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-gray-100"
                    )}
                  >
                    <Icon size={20} className={isActive ? "text-white" : ws.color} />
                  </button>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Admin Master Suite Mode (11 Modules)
  return (
    <div className="px-3 py-4 space-y-3 mb-2 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-t-xl">
      {isSidebarOpen && (
        <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
          <LayoutGrid size={12} /> Pilih Modul Master
        </div>
      )}
      {isSidebarOpen ? (
        <div className="grid grid-cols-2 gap-2 px-1">
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
            const Icon = hub.icon;
            const isLastOdd = index === visibleHubs.length - 1 && visibleHubs.length % 2 !== 0;

            return (
              <button
                key={hub.id}
                onClick={() => handleHubClick(hub.id)}
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
        <div className="flex flex-col items-center gap-3">
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
            const Icon = hub.icon;
            return (
              <Tooltip
                key={hub.id}
                content={hub.label}
                placement="right"
              >
                <button
                  onClick={() => handleHubClick(hub.id)}
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
