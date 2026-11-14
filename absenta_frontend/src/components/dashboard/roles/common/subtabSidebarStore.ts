import React, { useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';

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
  roleEcosystem?: string;
  color?: string;
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
      return ['satpam', 'gerbang', 'ringkasan', 'kelola', 'scan', 'log', 'izin'].includes(currentTab);
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

  // Tutup sidebar saat unmount hanya jika hook memiliki scope aktif
  useEffect(() => {
    if (!normalizedScope) return;
    return () => {
      closeStore();
    };
  }, [normalizedScope, closeStore]);

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
    isOpen: isMobileSidebarOpen,
    isScopeActive,
    activeScope,
    open: () => openStore(normalizedScope),
    close: closeStore,
    toggle: () => toggleStore(normalizedScope),
  };
}
