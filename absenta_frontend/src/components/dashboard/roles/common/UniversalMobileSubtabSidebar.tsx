import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import { 
  Menu, 
  X, 
  Search, 
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
  searchableThreshold?: number; // Show search box if tabs.length >= threshold, default 8
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
  searchableThreshold = 8,
}) => {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mount detection for React Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

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

  // Focus search input on open if present
  useEffect(() => {
    if (isOpen && tabs.length >= searchableThreshold) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, tabs.length, searchableThreshold]);

  // Filter tabs by search query
  const filteredTabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tabs;
    return tabs.filter((t) => {
      const matchLabel = t.label.toLowerCase().includes(q);
      const matchShort = t.shortLabel?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      return matchLabel || matchShort || matchDesc;
    });
  }, [tabs, searchQuery]);

  // Group tabs by categories if categories prop is provided
  const groupedSections = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [{ category: null, items: filteredTabs }];
    }

    const groups: Array<{ category: UniversalSubtabCategory | null; items: UniversalSubtabItem[] }> = [];

    // Map defined categories
    categories.forEach((cat) => {
      const items = filteredTabs.filter((t) => t.category === cat.id);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    });

    // Collect uncategorized tabs
    const uncategorized = filteredTabs.filter(
      (t) => !t.category || !categories.some((c) => c.id === t.category)
    );
    if (uncategorized.length > 0) {
      groups.push({ category: null, items: uncategorized });
    }

    return groups;
  }, [categories, filteredTabs]);

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
              'relative z-10 w-[86vw] max-w-[325px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden',
              isLeft ? 'mr-auto rounded-r-3xl' : 'ml-auto rounded-l-3xl',
              className
            )}
          >
            {/* ─── Drawer Header ─── */}
            <div className="p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-100 dark:border-slate-800/80 shrink-0 space-y-2.5">
              {/* Row 1: Role Badge & Close Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {roleBadge && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                      <Sparkles size={11} className="text-indigo-500" />
                      {roleBadge}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {tabs.length} Menu
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
                  title="Tutup Menu"
                  aria-label="Tutup Menu"
                >
                  <X size={19} className="stroke-[2.2]" />
                </button>
              </div>

              {/* Row 2: Title & Identity Icon */}
              <div className="flex items-center gap-2.5 min-w-0">
                {RoleIcon ? (
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                    <RoleIcon size={20} className="stroke-[2.2]" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Layers size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate tracking-tight">
                    {title}
                  </h2>
                  {subtitle && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
                      {subtitle}
                    </div>
                  )}
                </div>
              </div>

              {/* Header Extra (e.g. quick selector or switcher) */}
              {headerExtra && <div className="pt-1">{headerExtra}</div>}

              {/* Instant Search Bar (Only shown if tabs count >= searchableThreshold) */}
              {tabs.length >= searchableThreshold && (
                <div className="relative pt-1">
                  <div className="relative flex items-center">
                    <Search
                      size={14}
                      className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari subtab menu..."
                      className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 border-0 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Drawer Body (Scrollable Menu List) ─── */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-4 no-scrollbar">
              {filteredTabs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs space-y-1">
                  <p>Tidak ada menu yang sesuai</p>
                  <p className="text-[11px] text-slate-400">"{searchQuery}"</p>
                </div>
              ) : (
                groupedSections.map((group, gIdx) => {
                  const cat = group.category;
                  const CatIcon = cat?.icon;
                  return (
                    <div key={cat?.id || `group-${gIdx}`} className="space-y-1">
                      {/* Section Header if Category exists */}
                      {cat && (
                        <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {CatIcon && <CatIcon size={12} className="shrink-0 text-slate-500" />}
                            <span className="truncate">{cat.label}</span>
                          </div>
                          {cat.badge !== undefined && (
                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded-full text-[9px] font-extrabold',
                                cat.badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              )}
                            >
                              {cat.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tab Items in Group */}
                      <div className="space-y-1">
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
                                'w-full flex items-center justify-between min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer group',
                                isActive
                                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-[0.99]',
                                tab.disabled && 'opacity-40 cursor-not-allowed'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div
                                  className={cn(
                                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                    isActive
                                      ? 'bg-white/20 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-700/80'
                                  )}
                                >
                                  <Icon size={15} className="shrink-0" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-semibold leading-tight">
                                    {tab.label}
                                  </div>
                                  {tab.description && (
                                    <div
                                      className={cn(
                                        'text-[10px] truncate leading-tight mt-0.5',
                                        isActive
                                          ? 'text-indigo-100'
                                          : 'text-slate-400 dark:text-slate-500'
                                      )}
                                    >
                                      {tab.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {tab.badge !== undefined && (
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded-full text-[10px] font-black min-w-5 text-center',
                                      isActive
                                        ? 'bg-white/25 text-white'
                                        : tab.badgeColor || 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                    )}
                                  >
                                    {tab.badge}
                                  </span>
                                )}
                                {isActive && (
                                  <Check size={14} className="stroke-[2.5] text-white" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ─── Drawer Footer ─── */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800/80 text-center shrink-0 space-y-1">
              {footerExtra ? (
                footerExtra
              ) : (
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
                  Sentuh subtab untuk berpindah tampilan
                </p>
              )}
            </div>
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
            {currentTab?.label}
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
