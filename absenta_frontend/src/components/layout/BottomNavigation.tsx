import React, { useState, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  GraduationCap, 
  Clock, 
  Wallet, 
  UserCircle, 
  LayoutGrid, 
  ChevronRight, 
  X,
  Briefcase,
  Building2,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmartMenu } from '@/hooks/useSmartMenu';
import { iconForName } from '@/lib/iconForName';
import { useNavStore, type HubType } from '@/store/navStore';
import { useAuthStore } from '@/store/authStore';
import { MASTER_HUBS } from '@/config/navigation.config';

export const BottomNavigation = React.memo(({ onMenuToggle }: { onMenuToggle: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { menu: groupedMenu, setActiveHub, activeHub } = useSmartMenu();
  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const isPlatformUser = useMemo(() => {
    const roleName = String(user?.role?.name || '').toUpperCase();
    return roleName === 'SUPERADMIN' || roleName.startsWith('PLATFORM_') || user?.tenant_id === 'system';
  }, [user]);

  // Filter hubs based on role and available menu categories (Single Source of Truth)
  const availableHubs = useMemo(() => {
    if (isPlatformUser) return [];
    
    // Check which hubs have actual content in groupedMenu
    const activeHubIdsInMenu = new Set(
      groupedMenu.map(g => g.hubId).filter(Boolean)
    );

    return MASTER_HUBS.filter(hub => activeHubIdsInMenu.has(hub.id));
  }, [isPlatformUser, groupedMenu]);

  const hubCategories = useMemo(() => {
    if (!openSheet) return [];
    // Get all groups that belong to this Hub ID (Sync with Sidebar)
    return groupedMenu.filter(g => g.hubId === openSheet || g.label === 'Dashboard');
  }, [groupedMenu, openSheet]);

  // AUTO-SYNC: Ensure activeCategory is always valid and selected
  React.useEffect(() => {
    if (openSheet && hubCategories.length > 0) {
      const firstGroup = hubCategories[0]?.items[0];
      if (!activeCategory || !hubCategories[0]?.items.some(sg => sg.name === activeCategory)) {
        if (firstGroup) setActiveCategory(firstGroup.name);
      }
    } else if (!openSheet) {
      setActiveCategory(null);
    }
  }, [openSheet, hubCategories, activeCategory]);

  const handleHubClick = (hubId: string) => {
    if (openSheet === hubId) {
      setOpenSheet(null);
    } else {
      setActiveHub(hubId as HubType);
      setOpenSheet(hubId);
    }
  };

  return (
    <>
      {/* Swift-Up Sheet Container */}
      <AnimatePresence>
        {openSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenSheet(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[55] lg:hidden"
            />
            
            {/* The Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] lg:hidden max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Handlebar */}
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-4 mb-4 shrink-0" />
              
              {/* SMART LOGIC: Decide between Tabular or Single List */}
              {(() => {
                const groups = hubCategories[0]?.items || [];
                const hasMultipleGroups = groups.length > 1;
                // If only one group OR no sub-children in any group, use Single List
                const useSingleList = !hasMultipleGroups || groups.every(g => !g.children || g.children.length === 0);

                if (useSingleList) {
                  // SINGLE LIST MODE (e.g. Sarpras, Koperasi)
                  const allItems = groups.flatMap(g => {
                    // If the group itself is an item (no children), return it. Otherwise return its children.
                    if (!g.children || g.children.length === 0) return [g];
                    return g.children;
                  });

                  return (
                    <div className="flex-1 overflow-y-auto px-6 pb-32 pt-2">
                      <div className="space-y-0.5">
                        {allItems.map((item, iIdx) => {
                          const ItemIcon = iconForName(item.icon);
                          const isItemActive = location.pathname.includes(item.path || '');
                          return (
                            <button
                              key={iIdx}
                              onClick={() => {
                                if (item.path) {
                                  navigate(item.path);
                                  setOpenSheet(null);
                                }
                              }}
                              className={cn(
                                "w-full flex items-center justify-between py-2 px-3 rounded-xl transition-colors duration-300 group",
                                isItemActive 
                                  ? "bg-blue-50/50 dark:bg-blue-400/5 text-blue-600 dark:text-blue-400" 
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-1.5 rounded-lg transition-colors",
                                  isItemActive ? "bg-white dark:bg-slate-900 shadow-sm" : "bg-slate-100/50 dark:bg-slate-800/50"
                                )}>
                                  <ItemIcon size={16} strokeWidth={isItemActive ? 2.5 : 2} />
                                </div>
                                <span className="text-[12px] font-bold">{item.name}</span>
                              </div>
                              <ChevronRight size={12} className={cn("transition-transform opacity-20", isItemActive ? "translate-x-0 opacity-100" : "group-hover:opacity-100 group-hover:translate-x-0.5")} />
                            </button>
                          );
                        })}
                        {allItems.length === 0 && (
                          <div className="py-12 text-center text-xs text-slate-400 italic">Menu tidak tersedia</div>
                        )}
                      </div>
                    </div>
                  );
                }

                // TABULAR MODE (e.g. Akademik)
                return (
                  <>
                    <div className="relative shrink-0 border-b border-slate-100 dark:border-slate-800/50">
                      <div className="flex overflow-x-auto gap-0 px-6 pb-0 scrollbar-hide snap-x">
                        {groups.map((subGroup, idx) => {
                          const isActive = activeCategory === subGroup.name;
                          return (
                            <button
                              key={idx}
                              onClick={() => setActiveCategory(subGroup.name)}
                              className={cn(
                                "flex-shrink-0 px-5 py-3 text-[10px] font-black uppercase tracking-[0.12em] transition-colors duration-200 snap-start relative",
                                isActive 
                                  ? "text-blue-600 dark:text-blue-400" 
                                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                              )}
                            >
                              {subGroup.name}
                              {isActive && (
                                <motion.div 
                                  layoutId="activeTabUnderline"
                                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none" />
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-32 pt-2">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeCategory}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="space-y-0.5"
                        >
                          {groups.find(sg => sg.name === activeCategory)?.children?.map((item, iIdx) => {
                            const ItemIcon = iconForName(item.icon);
                            const isItemActive = location.pathname.includes(item.path || '');
                            
                            return (
                              <button
                                key={iIdx}
                                onClick={() => {
                                  if (item.path) {
                                    navigate(item.path);
                                    setOpenSheet(null);
                                    setActiveCategory(null);
                                  }
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between py-2 px-3 rounded-xl transition-colors duration-200 group",
                                  isItemActive 
                                    ? "bg-blue-50/50 dark:bg-blue-400/5 text-blue-600 dark:text-blue-400" 
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-1.5 rounded-lg transition-colors duration-200",
                                    isItemActive ? "bg-white dark:bg-slate-900 shadow-sm" : "bg-slate-100/50 dark:bg-slate-800/50"
                                  )}>
                                    <ItemIcon size={16} strokeWidth={isItemActive ? 2.5 : 2} />
                                  </div>
                                  <span className="text-[12px] font-bold">{item.name}</span>
                                </div>
                                <ChevronRight size={12} className={cn("transition-all duration-200 opacity-20", isItemActive ? "translate-x-0 opacity-100" : "group-hover:opacity-100 group-hover:translate-x-0.5")} />
                              </button>
                            );
                          })}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav 
        role="navigation"
        aria-label="Navigasi Bawah Mobile"
        className="lg:hidden fixed bottom-4 left-4 right-4 z-[70]"
      >
        <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-xl px-2 py-2 flex justify-around items-center h-18 max-w-lg mx-auto">
          {/* Beranda Button */}
          <NavLink
            to="/dashboard"
            onClick={() => setOpenSheet(null)}
            className={({ isActive }) => cn(
              "relative flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-300 py-1",
              isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
            )}
          >
             <div className={cn("p-2 rounded-xl transition-colors duration-300", location.pathname === '/dashboard' ? "scale-110 bg-blue-50 dark:bg-blue-400/10" : "")}>
                <Home className="w-6 h-6" />
             </div>
             <span className="text-[8px] font-black uppercase tracking-tight">Beranda</span>
          </NavLink>

          {/* Hub Buttons (Filtered by Role) */}
          {availableHubs.slice(0, 5).map((hub) => {
            const Icon = hub.icon;
            const isHubActive = activeHub === hub.id;
            const isCurrentOpen = openSheet === hub.id;
            
            return (
              <button
                key={hub.id}
                onClick={() => handleHubClick(hub.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-300 py-1",
                  (isHubActive || isCurrentOpen) ? hub.color : "text-slate-500 dark:text-slate-400"
                )}
              >
                <div className={cn(
                  "relative z-10 p-2 rounded-xl transition-transform duration-500",
                  isCurrentOpen ? "scale-110 -translate-y-1" : "scale-100"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <span className={cn(
                  "relative z-10 text-[8px] font-black uppercase tracking-tight transition-all opacity-100"
                )}>
                  {hub.label}
                </span>

                {(isHubActive && !isCurrentOpen) && (
                  <motion.div 
                    layoutId="activeHubIndicator"
                    className={cn("absolute inset-x-1 top-1 bottom-6 rounded-xl -z-0", hub.bg, "opacity-60")}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
});

BottomNavigation.displayName = 'BottomNavigation';
