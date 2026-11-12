import {
  LayoutDashboard,
  ArrowRightLeft,
  BarChart2,
  FileText,
  CheckCircle2,
  Laptop,
  Award,
  CalendarDays,
  Clock,
  Settings2,
  Layers,
  Users,
  UserCheck,
  Calendar,
  ShieldCheck,
  Printer,
  Network,
  type LucideIcon,
} from 'lucide-react';
import type { KurikulumTabId, KurikulumNavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export interface KurikulumTabDefinition {
  id: KurikulumTabId;
  label: string;
  shortLabel: string;
  category: 'operasional' | 'persiapan';
  icon: LucideIcon;
  color?: string;
  targetPath: string;
}

export interface KurikulumMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
}

export const KURIKULUM_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'operasional',
    label: 'Operasional',
    shortLabel: 'Operasional',
    icon: LayoutDashboard,
  },
  {
    id: 'persiapan',
    label: 'Persiapan',
    shortLabel: 'Persiapan',
    icon: Settings2,
  },
];

export const KURIKULUM_SUBTABS_BASE: KurikulumTabDefinition[] = [
  // ⚡ KATEGORI 1: OPERASIONAL
  { id: 'ringkasan', label: 'Monitoring', shortLabel: 'Monitoring', category: 'operasional', icon: LayoutDashboard, targetPath: '/dashboard?tab=kurikulum&subtab=ringkasan', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'delegasi', label: 'Delegasi', shortLabel: 'Delegasi', category: 'operasional', icon: ArrowRightLeft, targetPath: '/dashboard?tab=kurikulum&subtab=delegasi', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
  { id: 'rekap_kbm', label: 'Realisasi', shortLabel: 'Realisasi', category: 'operasional', icon: BarChart2, targetPath: '/dashboard?tab=kurikulum&subtab=rekap_kbm', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
  { id: 'perangkat', label: 'Perangkat', shortLabel: 'Perangkat', category: 'operasional', icon: FileText, targetPath: '/dashboard?tab=kurikulum&subtab=perangkat', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
  { id: 'supervisi', label: 'Supervisi', shortLabel: 'Supervisi', category: 'operasional', icon: CheckCircle2, targetPath: '/dashboard?tab=kurikulum&subtab=supervisi', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
  { id: 'evaluasi_kinerja', label: 'Evaluasi Kinerja', shortLabel: 'Evaluasi', category: 'operasional', icon: Award, targetPath: '/dashboard?tab=kurikulum&subtab=evaluasi_kinerja', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'cbt', label: 'Asesmen', shortLabel: 'Asesmen', category: 'operasional', icon: Laptop, targetPath: '/dashboard?tab=kurikulum&subtab=cbt', color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400' },
  { id: 'rapor', label: 'Rapor', shortLabel: 'Rapor', category: 'operasional', icon: Award, targetPath: '/dashboard?tab=kurikulum&subtab=rapor', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },

  // ⚙️ KATEGORI 2: PERSIAPAN
  { id: 'kalender', label: 'Kalender', shortLabel: 'Kalender', category: 'persiapan', icon: CalendarDays, targetPath: '/dashboard?tab=kurikulum&subtab=kalender', color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400' },
  { id: 'jam_kbm', label: 'Jam', shortLabel: 'Jam', category: 'persiapan', icon: Clock, targetPath: '/dashboard?tab=kurikulum&subtab=jam_kbm', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'aturan_absensi', label: 'Aturan', shortLabel: 'Aturan', category: 'persiapan', icon: Settings2, targetPath: '/dashboard?tab=kurikulum&subtab=aturan_absensi', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'struktur', label: 'Struktur', shortLabel: 'Struktur', category: 'persiapan', icon: Layers, targetPath: '/dashboard?tab=kurikulum&subtab=struktur', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
  { id: 'guru_mapel', label: 'Plotting', shortLabel: 'Plotting', category: 'persiapan', icon: Users, targetPath: '/dashboard?tab=kurikulum&subtab=guru_mapel', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
  { id: 'wali_kelas', label: 'Walas', shortLabel: 'Walas', category: 'persiapan', icon: UserCheck, targetPath: '/dashboard?tab=kurikulum&subtab=wali_kelas', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'jadwal', label: 'Jadwal', shortLabel: 'Jadwal', category: 'persiapan', icon: Calendar, targetPath: '/dashboard?tab=kurikulum&subtab=jadwal', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'piket', label: 'Piket', shortLabel: 'Piket', category: 'persiapan', icon: ShieldCheck, targetPath: '/dashboard?tab=kurikulum&subtab=piket', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
  { id: 'titimangsa_rapor', label: 'Titimangsa', shortLabel: 'Titimangsa', category: 'persiapan', icon: FileText, targetPath: '/dashboard?tab=kurikulum&subtab=titimangsa_rapor', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
  { id: 'cetak', label: 'Cetak', shortLabel: 'Cetak', category: 'persiapan', icon: Printer, targetPath: '/dashboard?tab=kurikulum&subtab=cetak', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
  { id: 'struktur_organisasi', label: 'Organisasi', shortLabel: 'Organisasi', category: 'persiapan', icon: Network, targetPath: '/dashboard?tab=kurikulum&subtab=struktur_organisasi', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
];

export interface KurikulumTabBadges {
  pendingPerangkat?: number;
  conflicts?: number;
  overloadCount?: number;
}

export function getKurikulumNavTabs(badges?: KurikulumTabBadges): KurikulumNavTabItem[] {
  return KURIKULUM_SUBTABS_BASE.map((tab) => {
    let badge: string | number | undefined;
    let badgeColor: string | undefined;

    if (tab.id === 'perangkat' && badges?.pendingPerangkat && badges.pendingPerangkat > 0) {
      badge = `${badges.pendingPerangkat}`;
      badgeColor = 'bg-teal-500 text-white';
    }
    if (tab.id === 'guru_mapel' && badges?.overloadCount && badges.overloadCount > 0) {
      badge = `${badges.overloadCount}`;
      badgeColor = 'bg-rose-500 text-white';
    }
    if (tab.id === 'jadwal' && badges?.conflicts && badges.conflicts > 0) {
      badge = `${badges.conflicts}`;
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

export function getKurikulumMobileChildren(): KurikulumMobileChildItem[] {
  return KURIKULUM_SUBTABS_BASE.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
