import {
  LayoutDashboard,
  Briefcase,
  Users,
  GraduationCap,
  Building2,
  Printer,
  Network,
  type LucideIcon,
} from 'lucide-react';
import type { BkkTabId, BkkNavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export interface BkkTabDefinition {
  id: BkkTabId;
  label: string;
  shortLabel: string;
  category: 'penyaluran' | 'alumni';
  icon: LucideIcon;
  color?: string;
  targetPath: string;
}

export interface BkkMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
  badge?: string | number | null;
}

export const BKK_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'penyaluran',
    label: 'Lowongan & Penyaluran',
    shortLabel: 'Penyaluran',
    icon: Briefcase,
  },
  {
    id: 'alumni',
    label: 'Alumni & Kemitraan',
    shortLabel: 'Alumni',
    icon: GraduationCap,
  },
];

export const BKK_SUBTABS_BASE: BkkTabDefinition[] = [
  // 💼 KATEGORI 1: LOWONGAN & PENYALURAN
  { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkasan', category: 'penyaluran', icon: LayoutDashboard, targetPath: '/dashboard?tab=bkk&subtab=ringkasan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'loker', label: 'Lowongan', shortLabel: 'Lowongan', category: 'penyaluran', icon: Briefcase, targetPath: '/dashboard?tab=bkk&subtab=loker', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'pelamar', label: 'Pelamar', shortLabel: 'Pelamar', category: 'penyaluran', icon: Users, targetPath: '/dashboard?tab=bkk&subtab=pelamar', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },

  // 🎓 KATEGORI 2: ALUMNI & KEMITRAAN
  { id: 'tracer', label: 'Tracer', shortLabel: 'Tracer', category: 'alumni', icon: GraduationCap, targetPath: '/dashboard?tab=bkk&subtab=tracer', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
  { id: 'mitra', label: 'Mitra', shortLabel: 'Mitra', category: 'alumni', icon: Building2, targetPath: '/dashboard?tab=bkk&subtab=mitra', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'rekap', label: 'Cetak', shortLabel: 'Cetak', category: 'alumni', icon: Printer, targetPath: '/dashboard?tab=bkk&subtab=rekap', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'struktur_organisasi', label: 'Organisasi', shortLabel: 'Organisasi', category: 'alumni', icon: Network, targetPath: '/dashboard?tab=bkk&subtab=struktur_organisasi', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
];

export interface BkkTabBadges {
  activeJobs?: number;
  pendingInterviews?: number;
  tracerAbsorbedPct?: number | string;
  totalMitra?: number;
}

export function getBkkNavTabs(badges?: BkkTabBadges): (BkkNavTabItem & { category: string })[] {
  return BKK_SUBTABS_BASE.map((tab) => {
    let badge: string | number | undefined;
    let badgeColor: string | undefined;

    if (tab.id === 'loker' && badges?.activeJobs && badges.activeJobs > 0) {
      badge = `${badges.activeJobs}`;
      badgeColor = 'bg-emerald-500 text-white';
    }
    if (tab.id === 'pelamar' && badges?.pendingInterviews && badges.pendingInterviews > 0) {
      badge = `${badges.pendingInterviews}`;
      badgeColor = 'bg-blue-500 text-white';
    }
    if (tab.id === 'tracer' && badges?.tracerAbsorbedPct) {
      badge = String(badges.tracerAbsorbedPct);
      badgeColor = 'bg-purple-500 text-white';
    }
    if (tab.id === 'mitra' && badges?.totalMitra && badges.totalMitra > 0) {
      badge = `${badges.totalMitra}`;
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

export function getBkkMobileChildren(): BkkMobileChildItem[] {
  return BKK_SUBTABS_BASE.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
