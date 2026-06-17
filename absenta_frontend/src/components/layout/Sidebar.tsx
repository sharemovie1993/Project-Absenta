import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronDown, Lock, AlertTriangle, Sparkles, 
  GraduationCap, Building2, Briefcase, Wallet, 
  ShoppingCart, Shield, LayoutGrid, Clock, Settings,
  Award
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { getSidebarMenu, MENU_QUERY_KEY } from '@/api/menu.api';
import type { SidebarMenuItem as BackendMenuItem } from '@/api/menu.api';
import iconForName from '@/lib/iconForName';
import Tooltip from '../ui/Tooltip';
import { fetchActiveSystemConfig } from '@/services/systemConfig';
import { useNavStore, type HubType } from '../../store/navStore';
import { HubSwitcher } from './HubSwitcher';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  isInline?: boolean;
}

export const Sidebar = React.memo(({ isOpen, onClose, onToggle, isInline = false }: SidebarProps) => {
  const { user, subscription, token } = useAuthStore();

  const location = useLocation();
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);
  const { activeHub, setActiveHub, detectHubFromPath } = useNavStore();

  // Auto-detect hub on mount and path change
  useEffect(() => {
    detectHubFromPath(location.pathname);
  }, [location.pathname]);

  const configQuery = useQuery({
    queryKey: ['system-config','active'],
    queryFn: async () => fetchActiveSystemConfig(),
  });
  const systemConfig = configQuery.data || null;

  const treeQuery = useQuery({
    queryKey: MENU_QUERY_KEY,
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    queryFn: async () => (await getSidebarMenu()).sidebar,
  });
  const isLoadingTree = treeQuery.isLoading;
  const isErrorTree = treeQuery.isError;
  const menuTree: BackendMenuItem[] = treeQuery.data ?? [];

  // Map backend menu to Sidebar nav item shape
  type NavItem = {
    label: string;
    path: string;
    type?: string | null;
    icon: any;
    locked?: boolean;
    feature_state?: 'LOCKED' | 'TRIAL' | 'ACTIVE' | 'EXPIRED';
    children?: NavItem[];
    badge?: string;
    state?: any;
  };

  const inferPathFromLabel = (label: string): { path: string; state?: any } | null => {
    const k = String(label || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');

    const map: Record<string, { path: string; state?: any }> = {
      semuadokumen: { path: '/documents' },
      semuadokument: { path: '/documents' },
      semuadocuments: { path: '/documents' },
      companydocument: { path: '/documents', state: { defaultCategory: 'ADMINISTRATIVE' } },
      companydocuments: { path: '/documents', state: { defaultCategory: 'ADMINISTRATIVE' } },
      manuals: { path: '/documents', state: { defaultCategory: 'MANUAL' } },
      manual: { path: '/documents', state: { defaultCategory: 'MANUAL' } },
      manualdocument: { path: '/documents', state: { defaultCategory: 'MANUAL' } },
      manualdocuments: { path: '/documents', state: { defaultCategory: 'MANUAL' } },
      legaldocument: { path: '/documents', state: { defaultCategory: 'LEGAL' } },
      legaldocuments: { path: '/documents', state: { defaultCategory: 'LEGAL' } },
      activityviewer: { path: '/documents/activities' },
      sarprasdashboard: { path: '/sarpras/dashboard' },
      dashboardsarpras: { path: '/sarpras/dashboard' },
    };

    return map[k] ?? null;
  };

  const mapToNavItems = (nodes: BackendMenuItem[]): NavItem[] => {
    return nodes.map((n) => {
      const rawPath = String(n.path ?? '').trim();
      const children = n.children ? mapToNavItems(n.children as BackendMenuItem[]) : undefined;
      const hasChildren = !!children && children.length > 0;

      const inferred = rawPath ? null : inferPathFromLabel(n.name);
      const normalizedPath = rawPath || inferred?.path || (hasChildren ? `menu:${n.id}` : '#');
      const normalizedState = inferred?.state;

      // Clean label from numbering (e.g., "1. Master Data" -> "Master Data")
      const cleanedLabel = n.name.replace(/^\d+\.\s*/, '');

      // DYNAMIC LOCK OVERRIDE:
      // Even if the backend says it's locked, we check the global authStore subscription.
      // This ensures real-time sync after a purchase without waiting for a menu re-fetch.
      const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
      const moduleMap: Record<string, string> = {
        '/cooperative': 'KOPERASI',
        '/attendance': 'ABSENSI',
        '/sarpras': 'SARPRAS',
        '/hubin': 'HUBIN',
        '/settings/whatsapp': 'WHATSAPP',
        '/notifications/whatsapp': 'WHATSAPP'
      };

      let dynamicFeatureState = n.feature_state;
      let dynamicLocked = n.locked;

      // Find if this path belongs to a paid module
      const matchedModule = Object.keys(moduleMap).find(mPath => normalizedPath.startsWith(mPath));
      if (matchedModule) {
        const moduleKey = moduleMap[matchedModule];
        const isActuallyUnlocked = Array.isArray(features) && features.includes(moduleKey);
        
        if (isActuallyUnlocked) {
          dynamicFeatureState = 'ACTIVE';
          dynamicLocked = false;
        }
      }

      // SMART ICON FALLBACK:
      // If backend icon is empty, use the cleanedLabel to find a matching icon
      const finalIcon = iconForName(n.icon || cleanedLabel) || (() => null);

      // REORDER SETTINGS CHILDREN:
      // Move 'Paket dan Langganan' to the top if it's within a settings-like menu
      let finalChildren = children;
      if (finalChildren && (cleanedLabel.toLowerCase().includes('setting') || cleanedLabel.toLowerCase().includes('pengaturan'))) {
        const promoItemIndex = finalChildren.findIndex(c => 
          c.label.toLowerCase().includes('paket') && c.label.toLowerCase().includes('langganan')
        );
        
        if (promoItemIndex > -1) {
          const promoItem = finalChildren.splice(promoItemIndex, 1)[0];
          finalChildren.unshift(promoItem); // Move to the very top
        }
      }

      return {
        label: cleanedLabel,
        path: normalizedPath,
        type: n.type,
        icon: finalIcon,
        locked: dynamicLocked,
        feature_state: dynamicFeatureState as any,
        children: finalChildren,
        state: normalizedState,
      };
    });
  };

  const sortTree = (nodes: BackendMenuItem[]): BackendMenuItem[] => {
    const sorted = [...nodes].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    return sorted.map((n: any) => ({
      ...n,
      children: n.children ? sortTree(n.children as BackendMenuItem[]) : undefined
    }));
  };

  const cleanEmptyParents = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      if (item.type === 'divider' || item.type === 'header') return true;
      if (item.children) {
        item.children = cleanEmptyParents(item.children);
        if (item.children.length > 0) return true;
      }
      if (!item.children || item.children.length === 0) {
         return item.path && item.path !== '#' && !item.path.startsWith('menu:') && !item.path.startsWith('/menu/');
      }
      return false;
    });
  };

  const getFilteredNavigation = () => {
    const sorted = sortTree(menuTree);
    const mapped = mapToNavItems(sorted);

    const finalTree: NavItem[] = [];

    // 1. Dashboard Injection (Keep it at the top as core global)
    const dashboardItems = mapped.filter(item => {
      const path = String(item.path || '').toLowerCase();
      const label = item.label.toLowerCase();
      return path === '/' || path.includes('/dashboard') || label.includes('dashboard');
    });
    
    // Add Dashboard if not already in the tree as a root item
    if (dashboardItems.length === 0) {
       finalTree.push({
         label: 'Dashboard',
         path: '/dashboard',
         icon: LayoutGrid,
         type: 'item'
       });
    } else {
       finalTree.push(...dashboardItems);
    }

    // 2. Find the root item matching the current activeHub and promote its children
    const hubRoot = mapped.find(item => {
       const path = String(item.path || '').toLowerCase();
       const label = item.label.toLowerCase();
       const isDashboard = path === '/' || path.includes('/dashboard') || label.includes('dashboard');
       
       if (isDashboard) return false;
       
       // Robust matching: trim and case-insensitive
       const cleanedItemLabel = item.label.trim().toUpperCase();
       const cleanedActiveHub = activeHub.trim().toUpperCase();
       
       return cleanedItemLabel === cleanedActiveHub;
    });

    if (hubRoot && hubRoot.children) {
      const activeChildren = [...cleanEmptyParents(hubRoot.children)];
      
      const isCoopHub = activeHub.trim().toUpperCase() === 'KOPERASI' || activeHub.trim().toUpperCase() === 'COOPERATIVE';
      const hasSettings = activeChildren.some(child => child.path === '/cooperative/settings');
      const canViewSettings = user?.capabilities?.includes('cooperative.settings.view') || user?.capabilities?.includes('cooperative.members.manage') || user?.role?.name === 'SUPERADMIN';
      
      if (isCoopHub && !hasSettings && canViewSettings) {
        activeChildren.push({
          label: 'Pengaturan Koperasi',
          path: '/cooperative/settings',
          icon: Settings,
          type: 'item'
        });
      }
      
      finalTree.push(...activeChildren);
    } else if (hubRoot) {
      finalTree.push(hubRoot);
    } else {
      // Safety Fallback: If no hub match is found, show all other items
      // This prevents a blank sidebar for users whose menus aren't hub-indexed
      const others = mapped.filter(item => {
        const path = String(item.path || '').toLowerCase();
        const label = item.label.toLowerCase();
        const isDashboard = path === '/' || path.includes('/dashboard') || label.includes('dashboard');
        return !isDashboard;
      });
      finalTree.push(...cleanEmptyParents(others));
    }

    return finalTree;
  };

  // Auto-expand the correct Hub folder based on current path
  useEffect(() => {
    const nav = getFilteredNavigation();
    const currentPath = location.pathname;
    
    // Find which root item contains the current path
    const activeRoot = nav.find(root => {
      if (root.path === currentPath) return true;
      if (root.children) {
        const checkChildren = (items: NavItem[]): boolean => {
          return items.some(child => {
            if (child.path === currentPath) return true;
            if (child.children) return checkChildren(child.children);
            return false;
          });
        };
        return checkChildren(root.children);
      }
      return false;
    });

    if (activeRoot && activeRoot.children && !openSubmenus.includes(activeRoot.path)) {
      setOpenSubmenus(prev => [...prev, activeRoot.path]);
    }
  }, [location.pathname, menuTree]);

  const startsWithEmoji = (text: string) => {
    // Regex simple untuk mendeteksi emoji di awal string
    return /^\p{Emoji}/u.test(text.trim());
  };

  const renderNavItems = (items: NavItem[], depth = 0) => {
    return items.map((item, index) => {
      if (item.type === 'divider') {
        return (
          <li key={`divider-${index}`} className="my-2 px-3">
            <hr className="sidebar-divider border-slate-200 dark:border-slate-800" />
          </li>
        );
      }

      if (item.type === 'header') {
        return (
          <li key={`header-${index}`} className={cn("mt-4 mb-2 px-4", depth > 0 && "hidden")}>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
              {item.label}
            </span>
          </li>
        );
      }

      const currentPath = `${location.pathname}${location.search || ''}`;
      const isActive = currentPath === item.path || location.pathname === item.path;
      const hasChildren = item.children && item.children.length > 0;
      const isSubmenuOpenState = isSubmenuOpen(item.path);
      const hasActiveChild = hasChildren && item.children && isChildActive(item.children);
      const Icon = item.icon;
      const isNonActiveBlocked = ['PENDING_PAYMENT','SUSPENDED','CANCELLED'].includes(String(subscription?.status || '')) && (user?.role?.name !== 'SUPERADMIN');
      const isAllowedPath = item.path.startsWith('/billing') || item.path.startsWith('/services') || item.path === '/reports' || item.path === '/settings';
      const isDisabled = isNonActiveBlocked && !isAllowedPath;
      const isLocked = item.locked;
      const featureState = item.feature_state;

      // Conditional padding based on depth
      const paddingLeft = isOpen ? (depth * 12) + 12 : 12;

      return (
        <li key={`${item.path}:${item.label}`} className="list-none">
          {hasChildren ? (
            <div>
              {(!isOpen && depth === 0) ? (
                 <Tooltip content={featureState === 'LOCKED' ? `🔒 ${item.label}` : featureState === 'EXPIRED' ? `⚠️ ${item.label} (Expired)` : item.label} placement="right">
                    <button
                      onClick={() => {
                        if (isDisabled) return;
                        toggleSubmenu(item.path);
                      }}
                      aria-label={item.label}
                      aria-expanded={isSubmenuOpenState}
                      className={cn(
                       "flex items-center justify-center w-full rounded-lg transition-colors duration-200 py-3",
                       "hover:bg-gray-100 dark:hover:bg-gray-800",
                       (isActive || hasActiveChild) && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
                       !isActive && !hasActiveChild && "text-gray-700 dark:text-gray-300",
                       isDisabled && "opacity-50 cursor-not-allowed"
                     )}
                   >
                     {featureState === 'LOCKED' ? (
                       <Lock className="w-5 h-5 text-gray-400" />
                     ) : featureState === 'EXPIRED' ? (
                       <AlertTriangle className="w-5 h-5 text-amber-500" />
                     ) : (
                       <Icon className={cn(
                         "w-5 h-5 flex-shrink-0",
                         (isActive || hasActiveChild) ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                       )} />
                     )}
                   </button>
                 </Tooltip>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (isDisabled) return;
                      toggleSubmenu(item.path);
                    }}
                    aria-label={item.label}
                    aria-expanded={isSubmenuOpenState}
                    style={{ paddingLeft: isOpen ? paddingLeft : 12 }}
                    className={cn(
                      "flex items-center justify-between w-full pr-3 py-2 rounded-lg transition-colors duration-200 group",
                      "hover:bg-slate-100 dark:hover:bg-slate-800",
                      (isActive || hasActiveChild) && [
                        "bg-blue-50/50 dark:bg-blue-900/10",
                        "text-blue-700 dark:text-blue-300"
                      ],
                      !isActive && !hasActiveChild && "text-slate-700 dark:text-slate-300",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      depth > 0 && "py-1.5"
                    )}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {featureState === 'LOCKED' ? (
                        <Lock className={cn(depth === 0 ? "w-4 h-4" : "w-3.5 h-3.5", "text-slate-400")} />
                      ) : featureState === 'EXPIRED' ? (
                        <AlertTriangle className={cn(depth === 0 ? "w-4 h-4" : "w-3.5 h-3.5", "text-amber-500")} />
                      ) : (
                        !startsWithEmoji(item.label) && (
                          <Icon className={cn(
                            depth === 0 ? "w-5 h-5" : "w-4 h-4",
                            "flex-shrink-0 transition-colors",
                            (isActive || hasActiveChild) ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 group-hover:text-blue-500"
                          )} />
                        )
                      )}
                      <span className={cn(
                        "font-medium truncate transition-colors",
                        depth === 0 ? "text-[14px]" : "text-[13px]",
                        (isActive || hasActiveChild) ? "font-bold" : "font-medium"
                      )}>
                        {item.label}
                      </span>
                      {featureState === 'TRIAL' && (
                        <span className="bg-blue-100 text-blue-600 text-[9px] px-1 py-0.5 rounded font-bold">TRIAL</span>
                      )}
                    </div>
                    {isOpen && (
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 text-slate-400",
                        isSubmenuOpenState && "rotate-180"
                      )} />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {isSubmenuOpenState && isOpen && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-1 space-y-1 overflow-hidden"
                      >
                        {item.children && renderNavItems(item.children, depth + 1)}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          ) : (
            <>
              {(!isOpen && depth === 0) ? (
                 <Tooltip content={featureState === 'LOCKED' ? `🔒 ${item.label}` : featureState === 'EXPIRED' ? `⚠️ ${item.label} (Expired)` : item.label} placement="right">
                   <Link
                     to={item.path}
                     state={item.state}
                     onClick={(e) => {
                       if (isDisabled) {
                         e.preventDefault();
                         return;
                       }
                     }}
                     className={cn(
                       "flex items-center justify-center w-full rounded-lg transition-colors duration-200 py-3",
                       "hover:bg-gray-100 dark:hover:bg-gray-800",
                       isActive && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
                       !isActive && "text-gray-700 dark:text-gray-300",
                       isDisabled && "opacity-50 cursor-not-allowed"
                     )}
                   >
                     {featureState === 'LOCKED' ? (
                       <Lock className="w-5 h-5 text-gray-400" />
                     ) : featureState === 'EXPIRED' ? (
                       <AlertTriangle className="w-5 h-5 text-amber-500" />
                     ) : (
                       <Icon className={cn(
                         "w-5 h-5 flex-shrink-0",
                         isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                       )} />
                     )}
                   </Link>
                 </Tooltip>
              ) : (
                <Link
                  to={item.path}
                  state={item.state}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.preventDefault();
                      return;
                    }
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  style={{ paddingLeft: isOpen ? paddingLeft : 12 }}
                  className={cn(
                    "flex items-center space-x-3 pr-3 py-2 rounded-lg transition-colors duration-200 group",
                    "hover:bg-slate-100 dark:hover:bg-slate-800",
                    isActive && [
                      "bg-blue-50 dark:bg-blue-900/20",
                      "text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-500/10"
                    ],
                    !isActive && "text-slate-700 dark:text-slate-300",
                    isDisabled && "opacity-50 cursor-not-allowed",
                    depth > 0 && "py-1.5"
                  )}
                >
                  {featureState === 'LOCKED' ? (
                    <Lock className={cn(depth === 0 ? "w-4 h-4" : "w-3.5 h-3.5", "text-slate-400")} />
                  ) : featureState === 'EXPIRED' ? (
                    <AlertTriangle className={cn(depth === 0 ? "w-4 h-4" : "w-3.5 h-3.5", "text-amber-500")} />
                  ) : (
                    !startsWithEmoji(item.label) && (
                      <Icon className={cn(
                        depth === 0 ? "w-5 h-5" : "w-4 h-4",
                        "flex-shrink-0 transition-colors",
                        isActive ? "text-blue-600 dark:text-blue-400" : (
                          item.label.toLowerCase().includes('paket') && item.label.toLowerCase().includes('langganan')
                          ? "text-indigo-600 dark:text-indigo-400 group-hover:text-amber-500"
                          : "text-slate-500 dark:text-slate-400 group-hover:text-blue-500"
                        )
                      )} />
                    )
                  )}
                  <span className={cn(
                    "font-medium truncate transition-colors",
                    depth === 0 ? "text-[14px]" : "text-[13px]",
                    isActive ? "font-bold" : "font-medium",
                    // Highlight Paket dan Langganan
                    item.label.toLowerCase().includes('paket') && item.label.toLowerCase().includes('langganan') && 
                    "text-indigo-600 dark:text-indigo-400 font-extrabold"
                  )}>
                    {item.label}
                    {item.label.toLowerCase().includes('paket') && item.label.toLowerCase().includes('langganan') && (
                      <Sparkles className="inline-block ml-1 h-3 w-3 text-amber-500 animate-pulse" />
                    )}
                  </span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}
            </>
          )}
        </li>
      );
    });
  };

  // Toggle submenu
  const toggleSubmenu = (path: string) => {
    setOpenSubmenus(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  // Check if submenu is open
  const isSubmenuOpen = (path: string) => openSubmenus.includes(path);

  // Check if any child is active
  const isChildActive = (children: any[]) => {
    const currentPath = `${location.pathname}${location.search || ''}`;
    return children.some((child) => currentPath === child.path || location.pathname === child.path);
  };

  const sidebarVariants = {
    open: {
      width: 320, // w-80
      x: 0,
      opacity: 1,
      transition: { duration: 0.3 }
    },
    closed: {
      width: window.innerWidth >= 1024 ? 80 : 0,
      x: window.innerWidth < 1024 ? "-100%" : 0,
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  const overlayVariants = {
    open: {
      opacity: 1,
      transition: { duration: 0.2 }
    },
    closed: {
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  // Auto-expand all submenus when activeHub changes
  useEffect(() => {
    if (activeHub && menuTree.length > 0) {
      const filtered = getFilteredNavigation();
      const folderIds: string[] = [];
      
      const collectFolderIds = (items: NavItem[]) => {
        items.forEach(item => {
          if (item.children && item.children.length > 0) {
            folderIds.push(item.path);
            collectFolderIds(item.children);
          }
        });
      };
      
      collectFolderIds(filtered);
      setOpenSubmenus(prev => Array.from(new Set([...prev, ...folderIds])));
    }
  }, [activeHub, menuTree.length]);

  return (
    <>
      <AnimatePresence>
        {isOpen && !isInline && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={isOpen ? "open" : "closed"}
        variants={isInline ? {} : sidebarVariants}
        className={cn(
          "sidebar sidenav flex flex-col z-40 rounded-xl pb-10 transition-[width,transform,opacity] duration-300 ease-in-out",
          isInline 
            ? "relative w-full min-h-full flex-1 border-none shadow-none bg-transparent" 
            : "fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
        )}
      >
        {!isInline && (
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3 overflow-hidden">
              {(systemConfig as any)?.logo_url ? (
                <img src={(systemConfig as any).logo_url} alt={systemConfig?.app_name || 'Absenta Logo'} className="w-8 h-8 rounded-md object-contain" />
              ) : (
                <img src="/logo.png" alt={systemConfig?.app_name || 'Absenta Logo'} className="w-8 h-8 rounded-md object-contain" />
              )}
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {systemConfig?.app_name || 'School App'}
              </span>
            </div>
            
            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              aria-label="Tutup Menu"
              className="lg:hidden p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        )}
        
        {/* Navigation */}
        <nav className={cn("flex-1", isOpen ? "p-4" : "lg:p-2 p-4")}>
          <HubSwitcher isSidebarOpen={isOpen} menuTree={menuTree} />
          
          <div className="h-4" /> {/* Spacer */}

          {isLoadingTree && (
            <div className="space-y-2 px-2" aria-hidden="true">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 w-full bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          )}
          {isErrorTree && (
            <div className="text-[11px] font-bold text-red-500 mb-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
              Gagal memuat menu.
            </div>
          )}
          {!isLoadingTree && !isErrorTree && menuTree.length === 0 && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800/50 italic">
              Menu tidak tersedia.
            </div>
          )}
          <ul className="space-y-2">
            {renderNavItems(getFilteredNavigation())}
          </ul>
        </nav>

        {/* System/Settings Section at the bottom - Always Expanded */}
        {(() => {
          const sistemNode = menuTree.find(n => n.name.trim().toUpperCase() === 'SISTEM');
          if (!sistemNode || !sistemNode.children) return null;

          const sistemChildren = mapToNavItems(sistemNode.children as BackendMenuItem[]);
          return (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 px-3 py-2 mb-1">
                <Shield className="w-4 h-4 text-slate-400" />
                {isOpen && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Sistem & Pengaturan
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {renderNavItems(sistemChildren, 0)}
              </ul>
            </div>
          );
        })()}

        {isOpen && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 text-center truncate">
              {systemConfig?.app_name || 'Absenta.id'}
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
