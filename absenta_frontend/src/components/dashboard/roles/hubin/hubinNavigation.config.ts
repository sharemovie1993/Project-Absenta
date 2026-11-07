import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  Award,
  Briefcase,
  GraduationCap,
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
  category: 'kemitraan' | 'karir';
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
    id: 'karir',
    label: 'Karir & Kelembagaan',
    shortLabel: 'Karir',
    icon: Briefcase,
  },
];

export const HUBIN_SUBTABS_BASE: HubinTabDefinition[] = [
  // 🏢 KATEGORI 1: KEMITRAAN & PKL
  { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkasan', category: 'kemitraan', icon: LayoutDashboard, targetPath: '/dashboard?tab=hubin&subtab=ringkasan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'mitra', label: 'Mitra', shortLabel: 'Mitra', category: 'kemitraan', icon: Building2, targetPath: '/dashboard?tab=hubin&subtab=mitra', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'penempatan', label: 'Penempatan', shortLabel: 'Penempatan', category: 'kemitraan', icon: Users, targetPath: '/dashboard?tab=hubin&subtab=penempatan', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
  { id: 'absensi', label: 'Presensi', shortLabel: 'Presensi', category: 'kemitraan', icon: ClipboardList, targetPath: '/dashboard?tab=hubin&subtab=absensi', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'nilai', label: 'Penilaian', shortLabel: 'Penilaian', category: 'kemitraan', icon: Award, targetPath: '/dashboard?tab=hubin&subtab=nilai', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },

  // 💼 KATEGORI 2: KARIR & KELEMBAGAAN
  { id: 'bkk', label: 'Loker', shortLabel: 'Loker', category: 'karir', icon: Briefcase, targetPath: '/dashboard?tab=hubin&subtab=bkk', color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400' },
  { id: 'tracer', label: 'Tracer', shortLabel: 'Tracer', category: 'karir', icon: GraduationCap, targetPath: '/dashboard?tab=hubin&subtab=tracer', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
  { id: 'rekap', label: 'Cetak', shortLabel: 'Cetak', category: 'karir', icon: Printer, targetPath: '/dashboard?tab=hubin&subtab=rekap', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
  { id: 'pengaturan', label: 'Pengaturan', shortLabel: 'Pengaturan', category: 'karir', icon: Settings, targetPath: '/dashboard?tab=hubin&subtab=pengaturan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'struktur_organisasi', label: 'Organisasi', shortLabel: 'Organisasi', category: 'karir', icon: Network, targetPath: '/dashboard?tab=hubin&subtab=struktur_organisasi', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
];

export interface HubinTabBadges {
  mouExpiringCount?: number;
  pklAktif?: number;
  unverifiedPresensi?: number;
  belumDinilai?: number;
  totalLowonganAktif?: number;
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
    if (tab.id === 'bkk' && badges?.totalLowonganAktif && badges.totalLowonganAktif > 0) {
      badge = `${badges.totalLowonganAktif}`;
      badgeColor = 'bg-sky-500 text-white';
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
