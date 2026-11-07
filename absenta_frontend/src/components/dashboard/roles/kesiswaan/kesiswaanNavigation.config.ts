import {
  LayoutDashboard,
  ShieldAlert,
  Trophy,
  HeartPulse,
  Award,
  FileSpreadsheet,
  Printer,
  Clock,
  Network,
  type LucideIcon,
} from 'lucide-react';
import type { KesiswaanTabId, KesiswaanNavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export interface KesiswaanTabDefinition {
  id: KesiswaanTabId;
  label: string;
  shortLabel: string;
  category: 'kedisiplinan' | 'regulasi';
  icon: LucideIcon;
  color?: string;
  targetPath: string;
}

export interface KesiswaanMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
}

export const KESISWAAN_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'kedisiplinan',
    label: 'Kedisiplinan & Karakter',
    shortLabel: 'Kedisiplinan',
    icon: ShieldAlert,
  },
  {
    id: 'regulasi',
    label: 'Regulasi & Pelaporan',
    shortLabel: 'Regulasi',
    icon: FileSpreadsheet,
  },
];

export const KESISWAAN_SUBTABS_BASE: KesiswaanTabDefinition[] = [
  // 🛡️ KATEGORI 1: KEDISIPLINAN & KARAKTER
  { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkasan', category: 'kedisiplinan', icon: LayoutDashboard, targetPath: '/dashboard?tab=kesiswaan&subtab=ringkasan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'pelanggaran', label: 'Pelanggaran', shortLabel: 'Pelanggaran', category: 'kedisiplinan', icon: ShieldAlert, targetPath: '/dashboard?tab=kesiswaan&subtab=pelanggaran', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
  { id: 'prestasi', label: 'Prestasi', shortLabel: 'Prestasi', category: 'kedisiplinan', icon: Trophy, targetPath: '/dashboard?tab=kesiswaan&subtab=prestasi', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'dhuha', label: 'Dhuha', shortLabel: 'Dhuha', category: 'kedisiplinan', icon: HeartPulse, targetPath: '/dashboard?tab=kesiswaan&subtab=dhuha', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'ketarunaan', label: 'Ketarunaan', shortLabel: 'Ketarunaan', category: 'kedisiplinan', icon: Award, targetPath: '/dashboard?tab=kesiswaan&subtab=ketarunaan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },

  // 📋 KATEGORI 2: REGULASI & PELAPORAN
  { id: 'tatib', label: 'Tatib', shortLabel: 'Tatib', category: 'regulasi', icon: FileSpreadsheet, targetPath: '/dashboard?tab=kesiswaan&subtab=tatib', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
  { id: 'rekap', label: 'Cetak', shortLabel: 'Cetak', category: 'regulasi', icon: Printer, targetPath: '/dashboard?tab=kesiswaan&subtab=rekap', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
  { id: 'aturan_absensi', label: 'Aturan', shortLabel: 'Aturan', category: 'regulasi', icon: Clock, targetPath: '/dashboard?tab=kesiswaan&subtab=aturan_absensi', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'struktur_organisasi', label: 'Organisasi', shortLabel: 'Organisasi', category: 'regulasi', icon: Network, targetPath: '/dashboard?tab=kesiswaan&subtab=struktur_organisasi', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
];

export interface KesiswaanTabBadges {
  todayViolations?: number;
  totalPrestasi?: number;
}

export function getKesiswaanNavTabs(badges?: KesiswaanTabBadges): (KesiswaanNavTabItem & { category: string })[] {
  return KESISWAAN_SUBTABS_BASE.map((tab) => {
    let badge: string | number | undefined;
    let badgeColor: string | undefined;

    if (tab.id === 'pelanggaran' && badges?.todayViolations && badges.todayViolations > 0) {
      badge = `${badges.todayViolations}`;
      badgeColor = 'bg-rose-500 text-white';
    }
    if (tab.id === 'prestasi' && badges?.totalPrestasi && badges.totalPrestasi > 0) {
      badge = `${badges.totalPrestasi}`;
      badgeColor = 'bg-amber-500 text-white';
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

export function getKesiswaanMobileChildren(): KesiswaanMobileChildItem[] {
  return KESISWAAN_SUBTABS_BASE.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
