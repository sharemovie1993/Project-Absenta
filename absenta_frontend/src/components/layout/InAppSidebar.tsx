import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, ChevronRight, Home, Plus, Lock, Sparkles, X, ShieldAlert 
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

interface ParsedMenuItem {
  id: string;
  label: string;
  path: string;
  icon: any;
  badge?: string;
  isDivider?: boolean;
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
  const { token } = useAuthStore();
  const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('access_token') || localStorage.getItem('token')) : null);

  // 1. Dapatkan metadata aplikasi kanonikal yang sedang aktif berdasarkan URL
  const activeApp = useMemo(() => {
    return getActiveApp(location.pathname);
  }, [location.pathname]);

  // 2. Kueri menu murni dari Database Backend (Single Source of Truth)
  const { data: rawMenuData, isLoading } = useQuery({
    queryKey: MENU_QUERY_KEY,
    enabled: !!authToken,
    queryFn: async () => {
      const res: any = await getSidebarMenu();
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.sidebar)) return res.sidebar;
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawMenu = (rawMenuData as SidebarMenuItem[]) || [];

  // 3. Ekstraksi menu yang relevan dengan domain aplikasi aktif secara rekursif (Dengan Pemisah Divider Klaster)
  const subMenuItems = useMemo<ParsedMenuItem[]>(() => {
    if (!activeApp || rawMenu.length === 0) return [];

    const appPrefixes = activeApp.pathPrefixes.map(p => p.toLowerCase());

    // Cari root group yang menaungi aplikasi aktif
    const matchingRoots = rawMenu.filter((rootNode: any) => {
      const rootName = String(rootNode.name || '').toUpperCase();
      const activeName = activeApp.name.toUpperCase();
      if (rootName === activeName) return true;

      const hasMatchingChild = (nodes: any[]): boolean => {
        return nodes.some(n => {
          const np = String(n.path || '').toLowerCase();
          if (np && appPrefixes.some(pref => np.startsWith(pref))) return true;
          if (n.children && Array.isArray(n.children)) return hasMatchingChild(n.children);
          return false;
        });
      };

      return rootNode.children && hasMatchingChild(rootNode.children);
    });

    const targetNodes = matchingRoots.length > 0 ? matchingRoots : rawMenu;

    const extractItems = (nodes: any[]): ParsedMenuItem[] => {
      const items: ParsedMenuItem[] = [];

      for (const node of nodes) {
        const rawPath = String(node.path || node.route || node.url || '').trim();
        const normPath = rawPath.toLowerCase();
        const isDivider = node.type === 'divider' || node.name === 'divider' || node.name === '---';

        if (isDivider) {
          if (items.length > 0 && !items[items.length - 1].isDivider) {
            items.push({
              id: String(node.id || `divider-${items.length}`),
              label: '---',
              path: '',
              icon: null,
              isDivider: true,
            });
          }
          continue;
        }

        const hasValidPath = normPath && normPath !== '#' && !normPath.startsWith('menu:');

        if (hasValidPath && appPrefixes.some(pref => normPath.startsWith(pref))) {
          const rawName = String(node.name || node.label || node.title || '').trim();
          const cleanLabel = rawName.replace(/^\d+\.\s*/, '');
          const IconComp = iconForName(node.icon || cleanLabel, activeApp.icon);

          items.push({
            id: String(node.id || rawPath),
            label: cleanLabel,
            path: rawPath,
            icon: IconComp,
            badge: node.badge,
            isDivider: false,
          });
        }

        const childNodes = node.children || node.items || node.subMenus;
        if (childNodes && Array.isArray(childNodes) && childNodes.length > 0) {
          items.push(...extractItems(childNodes));
        }
      }

      return items;
    };

    const allExtracted = extractItems(targetNodes);

    // Hapus divider jika berada di paling ujung akhir
    while (allExtracted.length > 0 && allExtracted[allExtracted.length - 1].isDivider) {
      allExtracted.pop();
    }

    // Deduplikasi berurutan dengan menjaga divider
    const result: ParsedMenuItem[] = [];
    allExtracted.forEach(item => {
      if (item.isDivider) {
        if (result.length > 0 && !result[result.length - 1].isDivider) {
          result.push(item);
        }
      } else {
        if (!result.some(u => !u.isDivider && u.path.toLowerCase() === item.path.toLowerCase())) {
          result.push(item);
        }
      }
    });

    return result;
  }, [rawMenu, activeApp]);

  if (!activeApp) {
    return null;
  }

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
      {/* Mobile Drawer Close Button Only */}
      {isMobileDrawer && onClose && (
        <div className="flex items-center justify-end p-2 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Menu"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* 2. Pintasan Kembali ke Portal Utama */}
      <div className="px-2 pt-2 pb-1">
        {(!isCollapsed || isMobileDrawer) ? (
          <Link
            to="/dashboard"
            onClick={isMobileDrawer ? onClose : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Home className="h-4 w-4 text-slate-400" />
            <span>Beranda Portal</span>
          </Link>
        ) : (
          <Tooltip content="Beranda Portal" side="right">
            <Link
              to="/dashboard"
              className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Home className="h-4 w-4" />
            </Link>
          </Tooltip>
        )}
      </div>

      <div className="my-1 border-t border-slate-100 dark:border-slate-800/80 mx-2" />

      {/* 3. Daftar Sub-Menu Kontekstual dari Database SSOT (Dengan Penyekat Garis Klaster) */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-1 px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {isLoading && (
          <div className="space-y-2 py-2 px-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && subMenuItems.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-xs text-slate-400">
              Tidak ada menu yang terdaftar di aplikasi ini.
            </p>
          </div>
        )}

        {!isLoading && subMenuItems.map((item, index) => {
          if (item.isDivider) {
            if (isCollapsed && !isMobileDrawer) {
              return (
                <div 
                  key={item.id || `divider-${index}`} 
                  className="my-2 w-7 mx-auto border-t border-slate-200 dark:border-slate-700/80" 
                />
              );
            }
            return (
              <div 
                key={item.id || `divider-${index}`} 
                className="my-2 border-t border-slate-200/80 dark:border-slate-800 mx-2" 
              />
            );
          }

          const currentFullPath = `${location.pathname}${location.search || ''}`;
          const isExactMatch = location.pathname === item.path || currentFullPath === item.path;
          const hasSiblingExactMatch = subMenuItems.some(s => !s.isDivider && s.path !== item.path && (location.pathname === s.path || currentFullPath === s.path));
          const isSubPathMatch = !hasSiblingExactMatch && item.path !== '/' && item.path !== '/settings' && location.pathname.startsWith(`${item.path}/`);
          const isActive = isExactMatch || isSubPathMatch;
          const IconComp = item.icon;

          if (isCollapsed && !isMobileDrawer) {
            return (
              <Tooltip key={item.path || index} content={item.label} side="right">
                <Link
                  to={item.path}
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
              key={item.path || index}
              to={item.path}
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

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {item.badge && (
                  <span className="bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* 5. Footer Ciutkan / Lebarkan Sidebar (Desktop Only) */}
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
