import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useBottomNavPersona, BottomNavItem } from '@/hooks/useBottomNavPersona';
import { useSmartMenu } from '@/hooks/useSmartMenu';
import { iconForName } from '@/lib/iconForName';
import { MASTER_HUBS } from '@/config/navigation.config';

export const BottomNavigation = React.memo(({ onMenuToggle }: { onMenuToggle?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { persona, navItems } = useBottomNavPersona();
  const { menu: groupedMenu } = useSmartMenu();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Categories in drawer for Management persona
  const availableGroups = useMemo(() => {
    return groupedMenu || [];
  }, [groupedMenu]);

  // Set default active category when drawer opens
  React.useEffect(() => {
    if (isDrawerOpen && availableGroups.length > 0 && !activeCategory) {
      const firstGroup = availableGroups[0]?.items[0];
      if (firstGroup) setActiveCategory(firstGroup.name);
    }
  }, [isDrawerOpen, availableGroups, activeCategory]);

  const handleItemClick = (item: BottomNavItem) => {
    if (item.id === 'kelola') {
      setIsDrawerOpen(!isDrawerOpen);
      return;
    }

    setIsDrawerOpen(false);
    if (item.path && item.path !== '#drawer') {
      navigate(item.path);
    }
  };

  // Suppress legacy floating bottom nav on Dashboard routes (which use their own inspected Tab Bottom Bar)
  const isDashboardRoute = location.pathname === '/dashboard' || 
                           location.pathname === '/dashboard/' ||
                           location.pathname.startsWith('/dashboard') ||
                           location.pathname.startsWith('/parent-app/dashboard');

  if (isDashboardRoute) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Nav Container */}
      <nav 
        aria-label="Navigasi Bawah Seluler Persona"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 md:hidden max-w-[95vw] w-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl shadow-slate-950/10 px-2 py-1 flex items-center gap-1 transition-all duration-300"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isSelected = item.path === '#drawer' ? isDrawerOpen : (location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)));

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer min-w-[54px]",
                isSelected
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
              )}
            >
              <Icon size={20} className={cn("transition-transform duration-200", isSelected && "scale-110")} />
              <span className="text-[9px] uppercase tracking-wider font-black mt-0.5 whitespace-nowrap">
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {isSelected && (
                <motion.div 
                  layoutId="activeBottomDotPersona"
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Floating Submenu Drawer Sheet (Dynamic Modules) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs md:hidden"
            />

            {/* Submenu Drawer Card */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-16 left-3 right-3 z-50 md:hidden max-h-[70vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-950/20 overflow-hidden flex flex-col"
            >
              {/* Header Drawer */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Modul Kelola Pengelola
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Akses modul operasional yang diizinkan</p>
                </div>

                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Drawer: Split View Layout */}
              <div className="flex flex-1 overflow-hidden divide-x divide-slate-100 dark:divide-slate-800/60">
                {/* Left Column: Categories List */}
                <div className="w-1/3 min-w-[110px] max-w-[130px] overflow-y-auto bg-slate-50/70 dark:bg-slate-950/40 p-2 space-y-1">
                  {availableGroups.map((group) => {
                    return group.items.map((subGroup) => {
                      const isCatSelected = activeCategory === subGroup.name;
                      const SubIcon = iconForName(subGroup.icon);

                      return (
                        <button
                          key={subGroup.name}
                          onClick={() => setActiveCategory(subGroup.name)}
                          className={cn(
                            "w-full text-left p-2 rounded-xl transition-all duration-150 flex flex-col items-start gap-1 cursor-pointer",
                            isCatSelected
                              ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700/60 text-blue-600 dark:text-blue-400 font-bold"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40"
                          )}
                        >
                          <SubIcon size={16} className={isCatSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-400"} />
                          <span className="text-[10px] font-bold tracking-tight line-clamp-1 leading-tight">
                            {subGroup.name}
                          </span>
                        </button>
                      );
                    });
                  })}
                </div>

                {/* Right Column: Menu Links */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-white dark:bg-slate-900">
                  {(() => {
                    const selectedSubGroup = availableGroups
                      .flatMap(g => g.items)
                      .find(sg => sg.name === activeCategory);

                    if (!selectedSubGroup || !selectedSubGroup.links?.length) {
                      return (
                        <div className="p-6 text-center text-slate-400 text-xs font-medium">
                          Pilih modul di sebelah kiri
                        </div>
                      );
                    }

                    return selectedSubGroup.links.map((link) => {
                      const LinkIcon = iconForName(link.icon);
                      const isActive = location.pathname === link.path;

                      return (
                        <button
                          key={link.path}
                          onClick={() => {
                            navigate(link.path);
                            setIsDrawerOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group text-left",
                            isActive
                              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/50 dark:border-blue-800/40"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn(
                              "p-1.5 rounded-lg shrink-0",
                              isActive
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                            )}>
                              <LinkIcon size={15} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs truncate">{link.name}</div>
                              {link.description && (
                                <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate font-normal">
                                  {link.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <ChevronRight size={14} className={cn(
                            "shrink-0 transition-transform group-hover:translate-x-0.5",
                            isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-300 dark:text-slate-600"
                          )} />
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

BottomNavigation.displayName = 'BottomNavigation';

export default BottomNavigation;
