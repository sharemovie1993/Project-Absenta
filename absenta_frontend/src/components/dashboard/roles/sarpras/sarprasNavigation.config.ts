import {
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  Wrench,
  Package,
  Printer,
  Map,
  Network,
  type LucideIcon,
} from 'lucide-react';
import type { SarprasTabId, SarprasNavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export interface SarprasTabDefinition {
  id: SarprasTabId;
  label: string;
  shortLabel: string;
  category: 'aset' | 'katalog_ruang';
  icon: LucideIcon;
  color?: string;
  targetPath: string;
}

export interface SarprasMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
  badge?: string | number | null;
}

export const SARPRAS_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'aset',
    label: 'Aset & Logistik',
    shortLabel: 'Aset',
    icon: Layers,
  },
  {
    id: 'katalog_ruang',
    label: 'Katalog & Tata Ruang',
    shortLabel: 'Katalog',
    icon: Package,
  },
];

export const SARPRAS_SUBTABS_BASE: SarprasTabDefinition[] = [
  // 📦 KATEGORI 1: ASET & LOGISTIK
  { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkasan', category: 'aset', icon: LayoutDashboard, targetPath: '/dashboard?tab=sarpras&subtab=ringkasan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'inventaris', label: 'Inventaris', shortLabel: 'Inventaris', category: 'aset', icon: Layers, targetPath: '/dashboard?tab=sarpras&subtab=inventaris', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
  { id: 'peminjaman', label: 'Peminjaman', shortLabel: 'Peminjaman', category: 'aset', icon: ArrowLeftRight, targetPath: '/dashboard?tab=sarpras&subtab=peminjaman', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
  { id: 'perbaikan', label: 'Perbaikan', shortLabel: 'Perbaikan', category: 'aset', icon: Wrench, targetPath: '/dashboard?tab=sarpras&subtab=perbaikan', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },

  // 🗺️ KATEGORI 2: KATALOG & TATA RUANG
  { id: 'katalog', label: 'Katalog', shortLabel: 'Katalog', category: 'katalog_ruang', icon: Package, targetPath: '/dashboard?tab=sarpras&subtab=katalog', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
  { id: 'denah', label: 'Denah', shortLabel: 'Denah', category: 'katalog_ruang', icon: Map, targetPath: '/dashboard?tab=sarpras&subtab=denah', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'rekap', label: 'Cetak', shortLabel: 'Cetak', category: 'katalog_ruang', icon: Printer, targetPath: '/dashboard?tab=sarpras&subtab=rekap', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
  { id: 'struktur_organisasi', label: 'Organisasi', shortLabel: 'Organisasi', category: 'katalog_ruang', icon: Network, targetPath: '/dashboard?tab=sarpras&subtab=struktur_organisasi', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
];

export interface SarprasTabBadges {
  totalAset?: number;
  borrowedAset?: number;
  repairAset?: number;
}

export function getSarprasNavTabs(badges?: SarprasTabBadges): (SarprasNavTabItem & { category: string })[] {
  return SARPRAS_SUBTABS_BASE.map((tab) => {
    let badge: string | number | undefined;
    let badgeColor: string | undefined;

    if (tab.id === 'inventaris' && badges?.totalAset && badges.totalAset > 0) {
      badge = `${badges.totalAset}`;
      badgeColor = 'bg-teal-500 text-white';
    }
    if (tab.id === 'peminjaman' && badges?.borrowedAset && badges.borrowedAset > 0) {
      badge = `${badges.borrowedAset}`;
      badgeColor = 'bg-indigo-500 text-white';
    }
    if (tab.id === 'perbaikan' && badges?.repairAset && badges.repairAset > 0) {
      badge = `${badges.repairAset}`;
      badgeColor = 'bg-rose-500 text-white';
    }

    return {
      id: tab.id,
      label: tab.label,
      shortLabel: tab.shortLabel,
      category: tab.category,
      icon: tab.icon,
      badge,
      badgeColor,
    };
  });
}

export function getSarprasMobileChildren(): SarprasMobileChildItem[] {
  return SARPRAS_SUBTABS_BASE.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
