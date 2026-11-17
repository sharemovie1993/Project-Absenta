import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  Award,
  Printer,
  Settings,
  Network,
  type LucideIcon,
} from 'lucide-react';
import type { HubinTabId, HubinNavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export interface HubinTabDefinition {
  id: HubinTabId;
  label: string;
  shortLabel: string;
  category: 'kemitraan' | 'administrasi';
  icon: LucideIcon;
  color?: string;
  targetPath: string;
}

export interface HubinMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
  badge?: string | number | null;
}

export const HUBIN_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'kemitraan',
    label: 'Kemitraan & PKL',
    shortLabel: 'Kemitraan',
    icon: Building2,
  },
  {
    id: 'administrasi',
    label: 'Administrasi & Tata Kelola',
    shortLabel: 'Administrasi',
    icon: Settings,
  },
];

export const HUBIN_SUBTABS_BASE: HubinTabDefinition[] = [
  // 🏢 KATEGORI 1: KEMITRAAN & PKL
  { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkasan', category: 'kemitraan', icon: LayoutDashboard, targetPath: '/dashboard?tab=hubin&subtab=ringkasan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'mitra', label: 'Mitra DU-DI', shortLabel: 'Mitra', category: 'kemitraan', icon: Building2, targetPath: '/dashboard?tab=hubin&subtab=mitra', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'penempatan', label: 'Penempatan', shortLabel: 'Penempatan', category: 'kemitraan', icon: Users, targetPath: '/dashboard?tab=hubin&subtab=penempatan', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
  { id: 'absensi', label: 'Presensi', shortLabel: 'Presensi', category: 'kemitraan', icon: ClipboardList, targetPath: '/dashboard?tab=hubin&subtab=absensi', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'nilai', label: 'Nilai & Sidang', shortLabel: 'Nilai & Sidang', category: 'kemitraan', icon: Award, targetPath: '/dashboard?tab=hubin&subtab=nilai', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },

  // 📋 KATEGORI 2: ADMINISTRASI & TATA KELOLA
  { id: 'rekap', label: 'Cetak Berkas', shortLabel: 'Cetak', category: 'administrasi', icon: Printer, targetPath: '/dashboard?tab=hubin&subtab=rekap', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
  { id: 'pengaturan', label: 'Pengaturan PKL', shortLabel: 'Pengaturan', category: 'administrasi', icon: Settings, targetPath: '/dashboard?tab=hubin&subtab=pengaturan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'struktur_organisasi', label: 'Organisasi', shortLabel: 'Organisasi', category: 'administrasi', icon: Network, targetPath: '/dashboard?tab=hubin&subtab=struktur_organisasi', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
];

export interface HubinTabBadges {
  mouExpiringCount?: number;
  pklAktif?: number;
  unverifiedPresensi?: number;
  belumDinilai?: number;
}

export function getHubinNavTabs(badges?: HubinTabBadges): (HubinNavTabItem & { category: string })[] {
  return HUBIN_SUBTABS_BASE.map((tab) => {
    let badge: string | number | undefined;
    let badgeColor: string | undefined;

    if (tab.id === 'mitra' && badges?.mouExpiringCount && badges.mouExpiringCount > 0) {
      badge = `${badges.mouExpiringCount} Exp`;
      badgeColor = 'bg-amber-500 text-white';
    }
    if (tab.id === 'penempatan' && badges?.pklAktif && badges.pklAktif > 0) {
      badge = `${badges.pklAktif}`;
      badgeColor = 'bg-teal-500 text-white';
    }
    if (tab.id === 'absensi' && badges?.unverifiedPresensi && badges.unverifiedPresensi > 0) {
      badge = `${badges.unverifiedPresensi}`;
      badgeColor = 'bg-emerald-500 text-white';
    }
    if (tab.id === 'nilai' && badges?.belumDinilai && badges.belumDinilai > 0) {
      badge = `${badges.belumDinilai}`;
      badgeColor = 'bg-purple-500 text-white';
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

export function getHubinMobileChildren(): HubinMobileChildItem[] {
  return HUBIN_SUBTABS_BASE.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
