import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Menu, 
  X, 
  ChevronRight, 
  Layers, 
  ChevronDown, 
  LogOut 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { 
  getEcosystemTokens, 
  EcosystemType, 
  getRoleEcosystemStyles, 
  getRoleEcosystemFromDashId,
  getEcosystemGradientClass,
} from '@/config/bottomNavEcosystems.config';
const ConfirmModal = React.lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.ConfirmModal })));

export {
  type UniversalSubtabItem,
  type UniversalSubtabCategory,
  normalizeRoleToScope,
  checkScopeMatchesUrlTab,
  type MobileSubtabSidebarStore,
  useMobileSubtabSidebarStore,
  useMobileSubtabSidebar,
} from './subtabSidebarStore';

import {
  type UniversalSubtabItem,
  type UniversalSubtabCategory,
  normalizeRoleToScope,
  checkScopeMatchesUrlTab,
  useMobileSubtabSidebarStore,
} from './subtabSidebarStore';

export interface UniversalMobileSubtabSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  roleBadge?: string;
  scope?: string;
  isActive?: boolean;
  roleIcon?: React.ComponentType<{ className?: string; size?: number }> | React.ComponentType<{ className?: string }>;
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

  const headerGradientClass = useMemo(() => {
    return getEcosystemGradientClass((myScope || 'portal') as EcosystemType);
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

  const prevLocationKeyRef = React.useRef(`${location.pathname}${location.search}`);

  // Auto-close hanya jika URL benar-benar berubah setelah komponen ter-mount (mencegah menutup seketika saat baru dibuka)
  useEffect(() => {
    const nextLocationKey = `${location.pathname}${location.search}`;
    if (prevLocationKeyRef.current === nextLocationKey) return;
    prevLocationKeyRef.current = nextLocationKey;
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
    <>
      {isEffectivelyOpen && (
        <div 
          className="fixed inset-0 z-[100] lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Menu Subtab Dashboard'}
        >
          {/* 1. Backdrop Overlay */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* 2. Slide-Over Mobile Drawer */}
          <div
            className={cn(
              'relative z-10 w-[78vw] max-w-[280px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in duration-200',
              isLeft ? 'mr-auto rounded-r-2xl slide-in-from-left' : 'ml-auto rounded-l-2xl slide-in-from-right',
              className
            )}
          >
            {/* ─── Drawer Header (Adaptif Gradien Ekosistem Opsi 1) ─── */}
            <div
              className={cn(
                'flex items-center justify-between px-3.5 py-3 shrink-0 relative overflow-hidden text-white border-b transition-colors shadow-xs',
                headerGradientClass
              )}
            >
              {/* Subtle ambient light glow in corner */}
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" aria-hidden="true" />

              <div className="flex items-center gap-2.5 min-w-0 pr-1.5 flex-1 relative z-10">
                {/* 1. Identity Visual: Logo Jurusan / Sekolah atau Role Icon Squircle */}
                {logoUrl && !imgError ? (
                  <div className="w-8 h-8 rounded-xl bg-white/95 border border-white/40 p-0.5 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={logoUrl}
                      alt={title}
                      className="w-full h-full object-contain rounded-lg"
                      onError={() => setImgError(true)}
                    />
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white/20 backdrop-blur-xs border border-white/30 text-white shadow-2xs"
                  >
                    {RoleIcon ? (
                      <RoleIcon className="w-4 h-4 text-white" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-white shadow-2xs" />
                    )}
                  </div>
                )}

                {/* 2. Title & Role Badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-sm font-bold text-white truncate tracking-tight drop-shadow-2xs">
                      {title}
                    </h2>
                    {showRoleBadge && (
                      <span
                        className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 leading-none bg-white/20 text-white backdrop-blur-xs border border-white/30 drop-shadow-2xs"
                      >
                        {roleBadge}
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <div className="text-[10px] text-white/80 font-medium truncate mt-0.5 leading-tight drop-shadow-2xs">
                      {subtitle}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="relative z-10 w-7 h-7 rounded-lg flex items-center justify-center text-white/85 hover:text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all border border-white/20 cursor-pointer shrink-0 ml-1 shadow-2xs"
                title="Tutup Menu"
                aria-label="Tutup Menu"
              >
                <X size={16} />
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
                groupedSections?.map((group, gIdx) => {
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
                        {group.items?.map((tab, idx) => {
                          const Icon = tab.icon;
                          const isActive = activeTab === tab.id;

                          // ── DETEKSI JABATAN DI HP (PERILAKU IDENTIK DENGAN BOTTOMNAV LAYER 1) ──
                          // Diberi warna yang sama sesuai warna jabatan dan berdenyut (pulsing beacon dot)
                          const isJabatan = group.category?.id === 'jabatan' || tab.category === 'jabatan' || Boolean(tab.roleEcosystem) || tab.id.startsWith('dash-');
                          const rawRoleEco = (tab.roleEcosystem as EcosystemType) 
                            || (tab.id.startsWith('dash-') ? getRoleEcosystemFromDashId(tab.id) : null) 
                            || (isJabatan ? getRoleEcosystemFromDashId(`dash-${tab.id}`) : null)
                            || null;
                          const roleEco = rawRoleEco as EcosystemType | null;
                          const roleStyle = roleEco ? getRoleEcosystemStyles(roleEco) : null;
                          const isRoleLauncher = Boolean(roleStyle && isJabatan && !isActive);

                          return (
                            <button
                              key={tab.id ? `tab-${tab.id}` : `tab-idx-${gIdx}-${idx}`}
                              type="button"
                              disabled={tab.disabled}
                              onClick={() => handleSelect(tab.id, tab.disabled)}
                              className={cn(
                                'w-full flex items-center justify-between min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer group relative',
                                isActive
                                  ? cn(ecosystemTokens.activeButton, ecosystemTokens.shadowClass, 'shadow-xs font-bold')
                                  : isRoleLauncher && roleStyle
                                    ? 'bg-slate-50/70 hover:bg-slate-100/90 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-100/90 dark:border-slate-800/60 active:scale-[0.99]'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-[0.99]',
                                tab.disabled && 'opacity-40 cursor-not-allowed'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div
                                  className={cn(
                                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all relative',
                                    isActive
                                      ? ecosystemTokens.activeIconBg
                                      : isRoleLauncher && roleStyle
                                        ? cn(roleStyle.pillBg, roleStyle.iconColor, roleStyle.pillRing, roleStyle.glowShadow)
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-700/80'
                                  )}
                                >
                                  <Icon 
                                    size={15} 
                                    className={cn(
                                      "shrink-0 transition-transform duration-200 group-hover:scale-110",
                                      isRoleLauncher && roleStyle ? roleStyle.iconColor : ""
                                    )} 
                                  />

                                  {/* Indikator Berdenyut (Pulsing Live Beacon) Sesuai Warna Jabatan */}
                                  {isRoleLauncher && roleStyle && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none z-10" aria-hidden="true">
                                      <span 
                                        className={cn(
                                          "animate-ping transform-gpu will-change-transform absolute inline-flex h-full w-full rounded-full opacity-80", 
                                          roleStyle.pulseDotRing
                                        )} 
                                      />
                                      <span 
                                        className={cn(
                                          "relative inline-flex rounded-full h-2.5 w-2.5 ring-1.5 ring-white dark:ring-slate-900 shadow-xs", 
                                          roleStyle.dotColor
                                        )} 
                                      />
                                    </span>
                                  )}
                                </div>

                                <span 
                                  className={cn(
                                    "truncate text-xs leading-none",
                                    isActive
                                      ? "font-bold text-white"
                                      : isRoleLauncher && roleStyle
                                        ? cn("font-bold tracking-tight", roleStyle.labelColor)
                                        : "font-semibold text-slate-700 dark:text-slate-300"
                                  )}
                                >
                                  {tab.shortLabel || tab.label}
                                </span>
                              </div>

                              {/* Badge atau Indikator Panah Sesuai Warna Jabatan */}
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {tab.badge !== undefined && (
                                  <span
                                    className={cn(
                                      'px-1.5 py-0.2 rounded-full text-[9.5px] font-black min-w-4 text-center leading-tight',
                                      isActive
                                        ? 'bg-white/25 text-white'
                                        : tab.badgeColor || (isRoleLauncher && roleStyle ? cn(roleStyle.pillBg, roleStyle.iconColor) : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300')
                                    )}
                                  >
                                    {tab.badge}
                                  </span>
                                )}
                                {isRoleLauncher && roleStyle && (
                                  <ChevronRight size={13} className={cn("opacity-35 group-hover:opacity-90 group-hover:translate-x-0.5 transition-all", roleStyle.iconColor)} />
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
          </div>
        </div>
      )}
      {/* Modal Dialog Konfirmasi Logout */}
      {showLogoutConfirm && (
        <React.Suspense fallback={null}>
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
        </React.Suspense>
      )}
    </>,
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

