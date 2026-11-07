import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import { 
  Menu, 
  X, 
  ChevronRight, 
  Check, 
  Layers, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// 1. Types & Interfaces
// ==========================================

export interface UniversalSubtabItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string; size?: number }> | React.ComponentType<any>;
  badge?: number | string;
  badgeColor?: string;
  category?: string;
  description?: string;
  disabled?: boolean;
}

export interface UniversalSubtabCategory {
  id: string;
  label: string;
  shortLabel?: string;
  badge?: number | string;
  badgeColor?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }> | React.ComponentType<any>;
}

export interface UniversalMobileSubtabSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  roleBadge?: string;
  roleIcon?: React.ComponentType<{ className?: string; size?: number }> | React.ComponentType<any>;
  tabs: UniversalSubtabItem[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  categories?: UniversalSubtabCategory[];
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

// ==========================================
// 2. Main Mobile Subtab Sidebar Component
// ==========================================

export const UniversalMobileSubtabSidebar: React.FC<UniversalMobileSubtabSidebarProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  roleBadge,
  roleIcon: RoleIcon,
  tabs,
  activeTab,
  onSelectTab,
  categories,
  headerExtra,
  footerExtra,
  side = 'left',
  className,
}) => {
  const [mounted, setMounted] = useState(false);

  // Mount detection for React Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // Group tabs by categories if categories prop is provided
  const groupedSections = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [{ category: null, items: tabs }];
    }

    const groups: Array<{ category: UniversalSubtabCategory | null; items: UniversalSubtabItem[] }> = [];

    // Map defined categories
    categories.forEach((cat) => {
      const items = tabs.filter((t) => t.category === cat.id);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    });

    // Collect uncategorized tabs
    const uncategorized = tabs.filter(
      (t) => !t.category || !categories.some((c) => c.id === t.category)
    );
    if (uncategorized.length > 0) {
      groups.push({ category: null, items: uncategorized });
    }

    return groups;
  }, [categories, tabs]);

  const handleSelect = useCallback(
    (tabId: string, disabled?: boolean) => {
      if (disabled) return;
      onSelectTab(tabId);
      onClose();
    },
    [onSelectTab, onClose]
  );

  if (!mounted) return null;

  const isLeft = side === 'left';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Menu Subtab Dashboard'}
        >
          {/* 1. Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            aria-hidden="true"
          />

          {/* 2. Slide-Over Mobile Drawer */}
          <motion.div
            initial={{ x: isLeft ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isLeft ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={cn(
              'relative z-10 w-[78vw] max-w-[280px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden',
              isLeft ? 'mr-auto rounded-r-2xl' : 'ml-auto rounded-l-2xl',
              className
            )}
          >
            {/* ─── Drawer Header (Clean, Minimal & Noise-Free) ─── */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
                title="Tutup Menu"
                aria-label="Tutup Menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Header Extra jika ada */}
            {headerExtra && <div className="px-3 pt-2 shrink-0">{headerExtra}</div>}

            {/* ─── Drawer Body (Scrollable Menu List) ─── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-2 space-y-3 no-scrollbar">
              {tabs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                  <p>Tidak ada menu</p>
                </div>
              ) : (
                groupedSections.map((group, gIdx) => {
                  const cat = group.category;
                  return (
                    <div key={cat?.id || `group-${gIdx}`} className="space-y-0.5">
                      {/* Category Label (Satu Kata / Minimalis) */}
                      {cat && (
                        <div className="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                          {cat.shortLabel || cat.label}
                        </div>
                      )}

                      {/* Tab Items in Group */}
                      <div className="space-y-0.5">
                        {group.items.map((tab) => {
                          const Icon = tab.icon;
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              disabled={tab.disabled}
                              onClick={() => handleSelect(tab.id, tab.disabled)}
                              className={cn(
                                'w-full flex items-center justify-between min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer group',
                                isActive
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-[0.99]',
                                tab.disabled && 'opacity-40 cursor-not-allowed'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div
                                  className={cn(
                                    'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                    isActive
                                      ? 'bg-white/20 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-700/80'
                                  )}
                                >
                                  <Icon size={14} className="shrink-0" />
                                </div>
                                <span className="truncate font-semibold text-xs leading-none">
                                  {tab.shortLabel || tab.label}
                                </span>
                              </div>

                              {tab.badge !== undefined && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.2 rounded-full text-[9.5px] font-black min-w-4 text-center ml-2 shrink-0 leading-tight',
                                    isActive
                                      ? 'bg-white/25 text-white'
                                      : tab.badgeColor || 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                  )}
                                >
                                  {tab.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ─── Drawer Footer (Hanya jika ada extra footer) ─── */}
            {footerExtra && (
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 shrink-0">
                {footerExtra}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ==========================================
// 3. Ergonomic Mobile Subtab Trigger Button
// ==========================================

export interface MobileSubtabTriggerButtonProps {
  tabs: UniversalSubtabItem[];
  activeTab: string;
  onClick: () => void;
  roleBadge?: string;
  className?: string;
  variant?: 'pill' | 'compact' | 'bar';
}

export const MobileSubtabTriggerButton: React.FC<MobileSubtabTriggerButtonProps> = ({
  tabs,
  activeTab,
  onClick,
  roleBadge,
  className,
  variant = 'pill',
}) => {
  const currentTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTab) || tabs[0];
  }, [tabs, activeTab]);

  const Icon = currentTab?.icon || Layers;

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'lg:hidden p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs',
          className
        )}
        title="Buka Menu Subtab"
        aria-label="Buka Menu Subtab"
      >
        <Menu size={14} className="text-indigo-600 dark:text-indigo-400 stroke-[2.2]" />
        <span className="text-[11px] font-bold truncate max-w-[100px] sm:max-w-none">
          {currentTab?.shortLabel || currentTab?.label}
        </span>
        {currentTab?.badge !== undefined && (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {currentTab.badge}
          </span>
        )}
        <ChevronDown size={12} className="text-slate-400" />
      </button>
    );
  }

  // Default 'pill' variant: High density, looks like a premier Shopee action strip
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'lg:hidden w-full flex items-center justify-between gap-2.5 px-3 py-2 bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-slate-900 dark:to-slate-950 text-white rounded-2xl shadow-sm hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer',
        className
      )}
      aria-label="Buka Sidebar Subtab Mobile"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
          <Icon size={14} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            {roleBadge && (
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300">
                {roleBadge} &bull;
              </span>
            )}
            <span className="text-[10px] text-slate-300 font-medium">Subtab Aktif</span>
          </div>
          <div className="text-xs font-black truncate text-white leading-tight">
            {currentTab?.shortLabel || currentTab?.label}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {currentTab?.badge !== undefined && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950">
            {currentTab.badge}
          </span>
        )}
        <div className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-xl text-[10.5px] font-bold text-white border border-white/10">
          <Menu size={12} />
          <span>Menu ({tabs.length})</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </button>
  );
};

// ==========================================
// 4. Mobile Subtab Bar (Toolbar Companion)
// ==========================================

export interface MobileSubtabBarProps {
  tabs: UniversalSubtabItem[];
  activeTab: string;
  onOpenSidebar: () => void;
  onSelectTab: (tabId: string) => void;
  roleBadge?: string;
  className?: string;
  showMiniScroller?: boolean;
}

export const MobileSubtabBar: React.FC<MobileSubtabBarProps> = ({
  tabs,
  activeTab,
  onOpenSidebar,
  onSelectTab,
  roleBadge,
  className,
  showMiniScroller = true,
}) => {
  const currentTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTab) || tabs[0];
  }, [tabs, activeTab]);

  return (
    <div className={cn('lg:hidden flex flex-col gap-1.5', className)}>
      {/* Primary Trigger Strip */}
      <MobileSubtabTriggerButton
        tabs={tabs}
        activeTab={activeTab}
        onClick={onOpenSidebar}
        roleBadge={roleBadge}
        variant="pill"
      />

      {/* Optional Mini Quick Scroller for High Frequency Tapping */}
      {showMiniScroller && tabs.length > 1 && (
        <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 pt-0.5 pb-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800'
                )}
              >
                <Icon size={12} className="shrink-0" />
                <span>{tab.shortLabel || tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[9px] font-black',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. Convenient State Hook & Global Store
// ==========================================

export interface MobileSubtabSidebarStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useMobileSubtabSidebarStore = create<MobileSubtabSidebarStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export function useMobileSubtabSidebar(initialState = false) {
  const { isOpen, open, close, toggle } = useMobileSubtabSidebarStore();

  useEffect(() => {
    if (initialState) {
      open();
    }
  }, [initialState, open]);

  return {
    isMobileSidebarOpen: isOpen,
    setIsMobileSidebarOpen: (openState: boolean) => (openState ? open() : close()),
    openMobileSidebar: open,
    closeMobileSidebar: close,
    toggleMobileSidebar: toggle,
  };
}
