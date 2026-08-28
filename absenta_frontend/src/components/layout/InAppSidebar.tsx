import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, ChevronRight, Home, Plus, Sparkles, ExternalLink, X
} from 'lucide-react';
import { getActiveApp, type AbsentaApp } from '@/config/absentaAppsRegistry';
import { getSidebarMenu, MENU_QUERY_KEY, type SidebarMenuItem } from '@/api/menu.api';
import { iconForName } from '@/lib/iconForName';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import Tooltip from '../ui/Tooltip';

interface InAppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileDrawer?: boolean;
}

export function InAppSidebar({
  isOpen = true,
  onClose,
  isCollapsed,
  onToggleCollapse,
  isMobileDrawer = false,
}: InAppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const activeApp = useMemo(() => {
    return getActiveApp(location.pathname);
  }, [location.pathname]);

  // Kueri menu dari database (SSOT)
  const { data: menuData } = useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: async () => (await getSidebarMenu()).sidebar,
    staleTime: 5 * 60 * 1000,
  });

  const rawMenu = menuData || [];

  // Filter menu yang masuk ke domain aplikasi aktif
  const subMenuItems = useMemo(() => {
    if (!activeApp) return [];

    const categoryKey = activeApp.category.toUpperCase();
    const appPrefixes = activeApp.pathPrefixes.map(p => p.toLowerCase());

    const matchingCategory = rawMenu.find(cat => 
      cat.label?.toUpperCase() === categoryKey ||
      (cat.children && cat.children.some(child => 
        child.path && appPrefixes.some(pref => child.path?.toLowerCase().startsWith(pref))
      ))
    );

    if (matchingCategory && matchingCategory.children && matchingCategory.children.length > 0) {
      return matchingCategory.children;
    }

    // Fallback: saring semua menu datar yang prefix URL-nya cocok
    const flatMatches: SidebarMenuItem[] = [];
    rawMenu.forEach(cat => {
      if (cat.children) {
        cat.children.forEach(child => {
          if (child.path && appPrefixes.some(pref => child.path?.toLowerCase().startsWith(pref))) {
            flatMatches.push(child);
          }
        });
      } else if (cat.path && appPrefixes.some(pref => cat.path?.toLowerCase().startsWith(pref))) {
        flatMatches.push(cat);
      }
    });

    return flatMatches;
  }, [rawMenu, activeApp]);

  if (!activeApp) {
    return null;
  }

  const AppIcon = activeApp.icon;

  return (
    <aside
      className={cn(
        "flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 select-none z-30",
        isMobileDrawer
          ? "w-full h-full"
          : isCollapsed
          ? "w-16"
          : "w-64"
      )}
    >
      {/* 1. Header Aplikasi Kontekstual */}
      <div className={cn(
        "flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800/80",
        isCollapsed && !isMobileDrawer ? "justify-center px-2" : "justify-between"
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
            activeApp.color.bg,
            activeApp.color.text
          )}>
            <AppIcon className="h-5 w-5" />
          </div>

          {(!isCollapsed || isMobileDrawer) && (
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight">
                {activeApp.name}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                Absenta Workspace
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {isMobileDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 2. Tombol Aksi Cepat Google-Style (+ Action Button) */}
      {activeApp.actionButton && (
        <div className={cn(
          "p-3 pb-2",
          isCollapsed && !isMobileDrawer ? "flex justify-center px-1" : ""
        )}>
          {isCollapsed && !isMobileDrawer ? (
            <Tooltip content={activeApp.actionButton.label} side="right">
              <button
                type="button"
                onClick={() => navigate(activeApp.actionButton!.path)}
                className="h-10 w-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isMobileDrawer && onClose) onClose();
                navigate(activeApp.actionButton!.path);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span>{activeApp.actionButton.label}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Daftar Sub-Menu Kontekstual */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-2 px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {/* Shortcut Kembali ke Portal */}
        {(!isCollapsed || isMobileDrawer) ? (
          <Link
            to="/dashboard"
            onClick={isMobileDrawer ? onClose : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors mb-2"
          >
            <Home className="h-4 w-4 text-slate-400" />
            <span>Beranda Portal</span>
          </Link>
        ) : (
          <Tooltip content="Beranda Portal" side="right">
            <Link
              to="/dashboard"
              className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors mb-2"
            >
              <Home className="h-4 w-4" />
            </Link>
          </Tooltip>
        )}

        {/* Separator */}
        <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

        {/* Render Menu Items */}
        {subMenuItems.map((item, index) => {
          const isActive = item.path ? location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) : false;
          const IconComp = iconForName(item.icon, AppIcon);

          if (isCollapsed && !isMobileDrawer) {
            return (
              <Tooltip key={item.id || item.path || index} content={item.label} side="right">
                <Link
                  to={item.path || '#'}
                  className={cn(
                    "flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <IconComp className={cn("h-4 w-4", isActive ? "text-blue-600 dark:text-blue-400" : "")} />
                </Link>
              </Tooltip>
            );
          }

          return (
            <Link
              key={item.id || item.path || index}
              to={item.path || '#'}
              onClick={isMobileDrawer ? onClose : undefined}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <IconComp className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                )} />
                <span className="truncate">{item.label}</span>
              </div>

              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </div>

      {/* 4. Footer Collapse Toggle (Desktop only) */}
      {!isMobileDrawer && (
        <div className="p-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "w-full flex items-center gap-2 p-2 rounded-xl text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              isCollapsed ? "justify-center" : "justify-between"
            )}
            title={isCollapsed ? "Lebarkan Sidebar" : "Kecilkan Sidebar (Mini-Rail)"}
          >
            {!isCollapsed && (
              <span className="text-[11px] font-medium text-slate-400">
                Ciutkan Sidebar
              </span>
            )}
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
export default InAppSidebar;
