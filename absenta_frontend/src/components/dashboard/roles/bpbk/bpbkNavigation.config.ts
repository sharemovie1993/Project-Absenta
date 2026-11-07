import {
  LayoutDashboard,
  FileText,
  HeartHandshake,
  MailOpen,
  Home,
  Share2,
  ClipboardList,
  Printer,
  Network,
  type LucideIcon,
} from 'lucide-react';
import type { BpbkTabId, BpbkNavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export interface BpbkTabDefinition {
  id: BpbkTabId;
  label: string;
  shortLabel: string;
  category: 'layanan' | 'intervensi';
  icon: LucideIcon;
  color?: string;
  targetPath: string;
}

export interface BpbkMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
  badge?: string | number | null;
}

export const BPBK_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'layanan',
    label: 'Layanan & Kasus',
    shortLabel: 'Layanan',
    icon: HeartHandshake,
  },
  {
    id: 'intervensi',
    label: 'Intervensi & Pelaporan',
    shortLabel: 'Intervensi',
    icon: ClipboardList,
  },
];

export const BPBK_SUBTABS_BASE: BpbkTabDefinition[] = [
  // 🤝 KATEGORI 1: LAYANAN & KASUS
  { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkasan', category: 'layanan', icon: LayoutDashboard, targetPath: '/dashboard?tab=bpbk&subtab=ringkasan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'cases', label: 'Kasus', shortLabel: 'Kasus', category: 'layanan', icon: FileText, targetPath: '/dashboard?tab=bpbk&subtab=cases', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'konseling', label: 'Konseling', shortLabel: 'Konseling', category: 'layanan', icon: HeartHandshake, targetPath: '/dashboard?tab=bpbk&subtab=konseling', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'pemanggilan', label: 'Panggilan', shortLabel: 'Panggilan', category: 'layanan', icon: MailOpen, targetPath: '/dashboard?tab=bpbk&subtab=pemanggilan', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },

  // 📋 KATEGORI 2: INTERVENSI & PELAPORAN
  { id: 'homevisit', label: 'Visit', shortLabel: 'Visit', category: 'intervensi', icon: Home, targetPath: '/dashboard?tab=bpbk&subtab=homevisit', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
  { id: 'rujukan', label: 'Rujukan', shortLabel: 'Rujukan', category: 'intervensi', icon: Share2, targetPath: '/dashboard?tab=bpbk&subtab=rujukan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
  { id: 'asesmen', label: 'Asesmen', shortLabel: 'Asesmen', category: 'intervensi', icon: ClipboardList, targetPath: '/dashboard?tab=bpbk&subtab=asesmen', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'rekap', label: 'Cetak', shortLabel: 'Cetak', category: 'intervensi', icon: Printer, targetPath: '/dashboard?tab=bpbk&subtab=rekap', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'struktur_organisasi', label: 'Organisasi', shortLabel: 'Organisasi', category: 'intervensi', icon: Network, targetPath: '/dashboard?tab=bpbk&subtab=struktur_organisasi', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
];

export interface BpbkTabBadges {
  criticalStudentsCount?: number;
  activeCounselingCount?: number;
  pendingCallsCount?: number;
}

export function getBpbkNavTabs(badges?: BpbkTabBadges): (BpbkNavTabItem & { category: string })[] {
  return BPBK_SUBTABS_BASE.map((tab) => {
    let badge: string | number | undefined;
    let badgeColor: string | undefined;

    if (tab.id === 'cases' && badges?.criticalStudentsCount && badges.criticalStudentsCount > 0) {
      badge = `${badges.criticalStudentsCount}`;
      badgeColor = 'bg-amber-500 text-white';
    }
    if (tab.id === 'konseling' && badges?.activeCounselingCount && badges.activeCounselingCount > 0) {
      badge = `${badges.activeCounselingCount}`;
      badgeColor = 'bg-emerald-500 text-white';
    }
    if (tab.id === 'pemanggilan' && badges?.pendingCallsCount && badges.pendingCallsCount > 0) {
      badge = `${badges.pendingCallsCount}`;
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

export function getBpbkMobileChildren(): BpbkMobileChildItem[] {
  return BPBK_SUBTABS_BASE.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
