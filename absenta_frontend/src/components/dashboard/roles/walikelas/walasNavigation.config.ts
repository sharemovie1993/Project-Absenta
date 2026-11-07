import {
  LayoutDashboard,
  Users,
  Shield,
  CalendarCheck,
  ShieldAlert,
  Radio,
  BookOpen,
  FileCheck2,
  Award,
  FileSpreadsheet,
  Printer,
  type LucideIcon,
} from 'lucide-react';
import type { WaliKelasTabId } from './types';
import type { UniversalSubtabCategory } from '../common';

export interface WalasTabDefinition {
  id: WaliKelasTabId;
  label: string;
  shortLabel: string;
  category: 'akademik' | 'pembinaan' | 'pelaporan';
  icon: LucideIcon;
  color?: string;
  targetPath: string;
}

export interface WalasMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
  badge?: string | number | null;
}

export const WALAS_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'akademik',
    label: 'Rombel & Akademik',
    shortLabel: 'Akademik',
    icon: Users,
  },
  {
    id: 'pembinaan',
    label: 'Presensi & Disiplin',
    shortLabel: 'Pembinaan',
    icon: CalendarCheck,
  },
  {
    id: 'pelaporan',
    label: 'Jurnal & Pelaporan',
    shortLabel: 'Pelaporan',
    icon: Printer,
  },
];

export const WALAS_SUBTABS_BASE: WalasTabDefinition[] = [
  // 👥 KATEGORI 1: ROMBEL & AKADEMIK
  { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkasan', category: 'akademik', icon: LayoutDashboard, targetPath: '/dashboard?tab=binaan&subtab=ringkasan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'siswa', label: 'Siswa', shortLabel: 'Siswa', category: 'akademik', icon: Users, targetPath: '/dashboard?tab=binaan&subtab=siswa', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
  { id: 'struktur', label: 'Struktur', shortLabel: 'Struktur', category: 'akademik', icon: Shield, targetPath: '/dashboard?tab=binaan&subtab=struktur', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'ketuntasan', label: 'Ketuntasan', shortLabel: 'Ketuntasan', category: 'akademik', icon: Radio, targetPath: '/dashboard?tab=binaan&subtab=ketuntasan', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },

  // 🛡️ KATEGORI 2: PRESENSI & DISIPLIN
  { id: 'presensi', label: 'Presensi', shortLabel: 'Presensi', category: 'pembinaan', icon: CalendarCheck, targetPath: '/dashboard?tab=binaan&subtab=presensi', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
  { id: 'deteksi', label: 'Deteksi', shortLabel: 'Deteksi', category: 'pembinaan', icon: ShieldAlert, targetPath: '/dashboard?tab=binaan&subtab=deteksi', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'izin', label: 'Izin', shortLabel: 'Izin', category: 'pembinaan', icon: FileCheck2, targetPath: '/dashboard?tab=binaan&subtab=izin', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'disiplin', label: 'Disiplin', shortLabel: 'Disiplin', category: 'pembinaan', icon: ShieldAlert, targetPath: '/dashboard?tab=binaan&subtab=disiplin', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
  { id: 'prestasi', label: 'Prestasi', shortLabel: 'Prestasi', category: 'pembinaan', icon: Award, targetPath: '/dashboard?tab=binaan&subtab=prestasi', color: 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400' },

  // 📊 KATEGORI 3: JURNAL & PELAPORAN
  { id: 'jurnal', label: 'Jurnal', shortLabel: 'Jurnal', category: 'pelaporan', icon: BookOpen, targetPath: '/dashboard?tab=binaan&subtab=jurnal', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
  { id: 'rekap', label: 'Rekap', shortLabel: 'Rekap', category: 'pelaporan', icon: FileSpreadsheet, targetPath: '/dashboard?tab=binaan&subtab=rekap', color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400' },
  { id: 'rapor', label: 'Rapor', shortLabel: 'Rapor', category: 'pelaporan', icon: Printer, targetPath: '/dashboard?tab=binaan&subtab=rapor', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
];

export interface WalasTabBadges {
  totalSiswa?: number;
  tidakHadirToday?: number;
  atRiskCount?: number;
  remedialCount?: number;
  totalJurnal?: number;
  pendingIzin?: number;
  totalPelanggaran?: number;
  totalPrestasi?: number;
}

export function getWalasNavTabs(badges?: WalasTabBadges) {
  return WALAS_SUBTABS_BASE.map((tab) => {
    let badge: number | string | undefined;

    if (tab.id === 'siswa' && badges?.totalSiswa && badges.totalSiswa > 0) badge = badges.totalSiswa;
    if (tab.id === 'presensi' && badges?.tidakHadirToday && badges.tidakHadirToday > 0) badge = badges.tidakHadirToday;
    if (tab.id === 'deteksi' && badges?.atRiskCount && badges.atRiskCount > 0) badge = badges.atRiskCount;
    if (tab.id === 'ketuntasan' && badges?.remedialCount && badges.remedialCount > 0) badge = badges.remedialCount;
    if (tab.id === 'jurnal' && badges?.totalJurnal && badges.totalJurnal > 0) badge = badges.totalJurnal;
    if (tab.id === 'izin' && badges?.pendingIzin && badges.pendingIzin > 0) badge = badges.pendingIzin;
    if (tab.id === 'disiplin' && badges?.totalPelanggaran && badges.totalPelanggaran > 0) badge = badges.totalPelanggaran;
    if (tab.id === 'prestasi' && badges?.totalPrestasi && badges.totalPrestasi > 0) badge = badges.totalPrestasi;

    return {
      id: tab.id,
      label: tab.label,
      shortLabel: tab.shortLabel,
      category: tab.category,
      icon: tab.icon,
      badge,
    };
  });
}

export function getWalasMobileChildren(): WalasMobileChildItem[] {
  return WALAS_SUBTABS_BASE.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
