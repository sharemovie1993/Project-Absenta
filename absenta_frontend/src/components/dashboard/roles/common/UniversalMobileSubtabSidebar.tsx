import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  ChevronDown,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/Modal';
import { getEcosystemTokens, EcosystemType } from '@/config/bottomNavEcosystems.config';

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
  targetPath?: string;
}

export interface UniversalSubtabCategory {
  id: string;
  label: string;
  shortLabel?: string;
  badge?: number | string;
  badgeColor?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }> | React.ComponentType<any>;
}

// ── PURE SCOPE NORMALIZATION & URL TAB RESOLVER ──
export function normalizeRoleToScope(roleBadge?: string, scope?: string): string {
  const raw = scope || roleBadge || '';
  if (!raw) return '';
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean === 'portal' || clean.includes('portal') || clean.includes('guru') || clean.includes('pendidik') || clean.includes('pengajar')) return 'portal';
  if (clean.includes('kaprog')) return 'kaprog';
  if (clean.includes('wali') || clean.includes('walas')) return 'walas';
  if (clean.includes('kurikulum')) return 'kurikulum';
  if (clean.includes('kesiswaan')) return 'kesiswaan';
  if (clean.includes('sarpras')) return 'sarpras';
  if (clean.includes('hubin')) return 'hubin';
  if (clean.includes('bkk')) return 'bkk';
  if (clean.includes('bp') || clean.includes('bk')) return 'bpbk';
  if (clean.includes('toolman')) return 'toolman';
  if (clean.includes('ekskul') || clean.includes('ekstra')) return 'ekskul';
  if (clean.includes('pkl') || clean.includes('pembimbing')) return 'pembimbing_pkl';
  if (clean.includes('satpam') || clean.includes('gerbang')) return 'satpam';
  if (clean.includes('koperasi')) return 'koperasi';
  if (clean.includes('tatausaha') || clean.includes('tu') || clean.includes('kepegawaian')) return 'tu';
  if (clean.includes('admin')) return 'admin';
  if (clean.includes('kepala') || clean.includes('kepsek')) return 'kepsek';
  if (clean.includes('siswa') || clean.includes('student')) return 'siswa';
  return clean;
}

export function checkScopeMatchesUrlTab(scope: string, currentTab: string): boolean {
  switch (scope) {
    case 'portal':
    case 'guru':
      return !currentTab || ['ringkasan', 'action_hub', 'rekap_mapel', 'jadwal', 'manual_presensi', 'kelola', 'profil'].includes(currentTab);
    case 'kaprog':
      return currentTab === 'kaprog';
    case 'walas':
      return currentTab === 'binaan' || currentTab === 'walas';
    case 'kurikulum':
      return currentTab === 'kurikulum';
    case 'kesiswaan':
      return currentTab === 'kesiswaan';
    case 'sarpras':
      return currentTab === 'sarpras';
    case 'hubin':
      return currentTab === 'hubin';
    case 'bkk':
      return currentTab === 'bkk';
    case 'bpbk':
      return currentTab === 'bpbk' || currentTab === 'bk';
    case 'toolman':
      return currentTab === 'toolman';
    case 'ekskul':
      return currentTab === 'ekskul';
    case 'pembimbing_pkl':
      return currentTab === 'pembimbing_pkl';
    case 'satpam':
      return currentTab === 'satpam' || currentTab === 'gerbang';
    case 'koperasi':
      return currentTab === 'koperasi';
    case 'tu':
      return currentTab === 'tu' || currentTab === 'kepegawaian';
    case 'admin':
      return currentTab === 'admin';
    case 'kepsek':
      return currentTab === 'ringkasan' || currentTab === 'kepsek';
    case 'siswa':
      return !currentTab || ['ringkasan', 'pkl', 'cbt', 'portal', 'kehadiran', 'catatan', 'berkas', 'profil', 'siswa'].includes(currentTab);
    default:
      return true;
  }
}

export interface UniversalMobileSubtabSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  roleBadge?: string;
  scope?: string;
  isActive?: boolean;
  roleIcon?: React.ComponentType<{ className?: string; size?: number }> | React.ComponentType<any>;
  logoUrl?: string | null;
  tabs: UniversalSubtabItem[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  categories?: UniversalSubtabCategory[];
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
  isFallback?: boolean;
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
  scope,
  isActive,
  roleIcon: RoleIcon,
  logoUrl,
  tabs,
  activeTab,
  onSelectTab,
  categories,
  headerExtra,
  footerExtra,
  side = 'left',
  className,
  isFallback = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const handleLogout = useCallback(() => {
    logout();
    onClose();
    useMobileSubtabSidebarStore.getState().close();
    setShowLogoutConfirm(false);
    navigate('/login');
    toast.success('Berhasil keluar dari akun!');
  }, [logout, onClose, navigate]);

  const currentTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'ringkasan';
  }, [location.search]);

  const myScope = useMemo(() => {
    return normalizeRoleToScope(roleBadge, scope);
  }, [roleBadge, scope]);

  const ecosystemTokens = useMemo(() => {
    return getEcosystemTokens((myScope || 'portal') as EcosystemType);
  }, [myScope]);

  const activeStoreScope = useMobileSubtabSidebarStore((state) => state.activeScope);

  const isScopeMatch = useMemo(() => {
    if (isFallback) return true;
    if (!myScope) return true;
    if (activeStoreScope && activeStoreScope !== myScope) return false;
    if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
      return checkScopeMatchesUrlTab(myScope, currentTab);
    }
    return true;
  }, [isFallback, myScope, activeStoreScope, location.pathname, currentTab]);

  const isEffectivelyOpen = Boolean(isOpen && isActive !== false && isScopeMatch);

  // Auto-close jika URL berubah saat drawer sedang terbuka (mencegah drawer menggantung saat navigasi)
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname, location.search]);

  // Registrasi scope aktif ke global store saat komponen sidebar mount (kecuali fallback global)
  useEffect(() => {
    if (!myScope || isFallback) return;
    useMobileSubtabSidebarStore.getState().registerScope(myScope);
    return () => {
      useMobileSubtabSidebarStore.getState().unregisterScope(myScope);
    };
  }, [myScope, isFallback]);

  // Mount detection for React Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isEffectivelyOpen) return;

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
  }, [isEffectivelyOpen, onClose]);

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
      useMobileSubtabSidebarStore.getState().close();
    },
    [onSelectTab, onClose]
  );

  const showRoleBadge = useMemo(() => {
    if (!roleBadge) return false;
    const cleanBadge = roleBadge.trim().toLowerCase();
    const cleanTitle = title.trim().toLowerCase();
    if (cleanBadge === cleanTitle) return false;
    if (cleanTitle.includes(cleanBadge) && cleanBadge.length > 5) return false;
    return true;
  }, [roleBadge, title]);

  if (!mounted) return null;

  const isLeft = side === 'left';

  return createPortal(
    <AnimatePresence>
      {isEffectivelyOpen && (
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
            {/* ─── Drawer Header (Clean, Shopee-Grade with Logo & Zero Truncation) ─── */}
            <div className="flex items-center justify-between px-3.5 py-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0 pr-1.5 flex-1">
                {/* 1. Identity Visual: Logo Jurusan / Sekolah atau Role Icon Squircle */}
                {logoUrl && !imgError ? (
                  <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-0.5 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={logoUrl}
                      alt={title}
                      className="w-full h-full object-contain rounded-lg"
                      onError={() => setImgError(true)}
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs',
                      ecosystemTokens.subtleBg,
                      ecosystemTokens.borderClass
                    )}
                  >
                    {RoleIcon ? (
                      <RoleIcon className={cn('w-4 h-4', ecosystemTokens.textClass)} />
                    ) : (
                      <span className={cn('w-2.5 h-2.5 rounded-full', ecosystemTokens.badgeClass.split(' ')[0])} />
                    )}
                  </div>
                )}

                {/* 2. Title & Role Badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">
                      {title}
                    </h2>
                    {showRoleBadge && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 leading-none border',
                          ecosystemTokens.subtleBg,
                          ecosystemTokens.subtleText,
                          ecosystemTokens.borderClass
                        )}
                      >
                        {roleBadge}
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5 leading-tight">
                      {subtitle}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shrink-0 ml-1"
                title="Tutup Menu"
                aria-label="Tutup Menu"
              >
                <X size={17} />
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
                    <div key={cat?.id ? `cat-${cat.id}` : `group-${gIdx}`} className="space-y-0.5">
                      {/* Category Label (Satu Kata / Minimalis) */}
                      {cat && (
                        <div className="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                          {cat.shortLabel || cat.label}
                        </div>
                      )}

                      {/* Tab Items in Group */}
                      <div className="space-y-0.5">
                        {group.items.map((tab, idx) => {
                          const Icon = tab.icon;
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id ? `tab-${tab.id}` : `tab-idx-${gIdx}-${idx}`}
                              type="button"
                              disabled={tab.disabled}
                              onClick={() => handleSelect(tab.id, tab.disabled)}
                              className={cn(
                                'w-full flex items-center justify-between min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer group',
                                isActive
                                  ? cn(ecosystemTokens.activeButton, ecosystemTokens.shadowClass, 'shadow-xs font-bold')
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-[0.99]',
                                tab.disabled && 'opacity-40 cursor-not-allowed'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div
                                  className={cn(
                                    'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                    isActive
                                      ? ecosystemTokens.activeIconBg
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

            {/* ─── Drawer Footer (Logout & Extra Actions) ─── */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
              {footerExtra}
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/70 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <LogOut size={15} className="stroke-[2.2]" />
                <span>Keluar dari Akun (Logout)</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Modal Dialog Konfirmasi Logout */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Konfirmasi Keluar Sesi"
        message="Apakah Anda yakin ingin keluar dari akun Absenta? Anda harus masuk kembali untuk mengakses fitur sistem."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        zIndex={200}
      />
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

  const scope = useMemo(() => normalizeRoleToScope(roleBadge), [roleBadge]);
  const ecosystemTokens = useMemo(() => getEcosystemTokens((scope || 'portal') as EcosystemType), [scope]);

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
        <Menu size={14} className={cn("stroke-[2.2]", ecosystemTokens.subtleText)} />
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
              <span className={cn("text-[9px] font-black uppercase tracking-wider", ecosystemTokens.subtleText)}>
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

export const MobileSubtabBar: React.FC<MobileSubtabBarProps> = () => {
  // Subtab switcher horizontal dinonaktifkan karena telah dipusatkan ke Elevated Button di Bottom Navigation
  return null;
};

// ==========================================
// 5. Convenient State Hook & Global Store
// ==========================================

export interface MobileSubtabSidebarStore {
  isOpen: boolean;
  activeScope: string | null;
  registeredScopes: string[];
  registerScope: (scope: string) => void;
  unregisterScope: (scope: string) => void;
  open: (scope?: string) => void;
  close: () => void;
  toggle: (scope?: string) => void;
  reset: () => void;
}

export const useMobileSubtabSidebarStore = create<MobileSubtabSidebarStore>((set) => ({
  isOpen: false,
  activeScope: null,
  registeredScopes: [],
  registerScope: (scope: string) => set((state) => {
    const normalized = normalizeRoleToScope(undefined, scope);
    if (!normalized || state.registeredScopes.includes(normalized)) return state;
    return { registeredScopes: [...state.registeredScopes, normalized] };
  }),
  unregisterScope: (scope: string) => set((state) => {
    const normalized = normalizeRoleToScope(undefined, scope);
    if (!normalized) return state;
    return { registeredScopes: state.registeredScopes.filter((s) => s !== normalized) };
  }),
  open: (scope?: string) => set({ 
    isOpen: true, 
    activeScope: scope ? normalizeRoleToScope(undefined, scope) : null 
  }),
  close: () => set({ isOpen: false, activeScope: null }),
  toggle: (scope?: string) => set((state) => {
    const normalized = scope ? normalizeRoleToScope(undefined, scope) : null;
    if (state.isOpen && (!normalized || state.activeScope === normalized)) {
      return { isOpen: false, activeScope: null };
    }
    return {
      isOpen: true,
      activeScope: normalized,
    };
  }),
  reset: () => set({ isOpen: false, activeScope: null, registeredScopes: [] }),
}));

export function useMobileSubtabSidebar(scopeOrInitialState?: string | boolean) {
  const scope = typeof scopeOrInitialState === 'string' ? scopeOrInitialState : undefined;
  const initialOpen = typeof scopeOrInitialState === 'boolean' ? scopeOrInitialState : false;

  const isOpen = useMobileSubtabSidebarStore((state) => state.isOpen);
  const activeScope = useMobileSubtabSidebarStore((state) => state.activeScope);
  const openStore = useMobileSubtabSidebarStore((state) => state.open);
  const closeStore = useMobileSubtabSidebarStore((state) => state.close);
  const toggleStore = useMobileSubtabSidebarStore((state) => state.toggle);

  const location = useLocation();
  const currentTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'ringkasan';
  }, [location.search]);

  const normalizedScope = useMemo(() => {
    return scope ? normalizeRoleToScope(undefined, scope) : undefined;
  }, [scope]);

  // Daftarkan scope ke global store saat hook aktif
  useEffect(() => {
    if (!normalizedScope) return;
    useMobileSubtabSidebarStore.getState().registerScope(normalizedScope);
    return () => {
      useMobileSubtabSidebarStore.getState().unregisterScope(normalizedScope);
    };
  }, [normalizedScope]);

  // Validasi kecocokan scope terhadap URL aktif di /dashboard
  const isScopeActive = useMemo(() => {
    if (!normalizedScope) return true;
    if (location.pathname !== '/dashboard' && location.pathname !== '/dashboard/') return true;
    return checkScopeMatchesUrlTab(normalizedScope, currentTab);
  }, [normalizedScope, location.pathname, currentTab]);

  useEffect(() => {
    if (initialOpen && isScopeActive) {
      openStore(normalizedScope);
    }
  }, [initialOpen, isScopeActive, openStore, normalizedScope]);

  // Tutup sidebar saat unmount untuk mencegah sidebar menggantung
  useEffect(() => {
    return () => {
      closeStore();
    };
  }, [closeStore]);

  const isMobileSidebarOpen = useMemo(() => {
    if (!isOpen) return false;
    if (!isScopeActive) return false;
    if (activeScope && normalizedScope && activeScope !== normalizedScope) return false;
    return true;
  }, [isOpen, isScopeActive, activeScope, normalizedScope]);

  return {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen: (openState: boolean) => (openState ? openStore(normalizedScope) : closeStore()),
    openMobileSidebar: () => openStore(normalizedScope),
    closeMobileSidebar: closeStore,
    toggleMobileSidebar: () => toggleStore(normalizedScope),
  };
}
