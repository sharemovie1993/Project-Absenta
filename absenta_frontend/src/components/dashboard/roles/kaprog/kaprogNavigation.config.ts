import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Wrench,
  CalendarCheck,
  ShieldAlert,
  Trophy,
  Briefcase,
  UserCheck,
  ClipboardCheck,
  Scale,
  Award,
  Printer,
  type LucideIcon,
} from 'lucide-react';
import type { KaprogTabId, KaprogCategory, NavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export interface KaprogMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
}

export interface KaprogTabDefinition {
  id: KaprogTabId;
  label: string;
  shortLabel?: string;
  category: KaprogCategory;
  icon: LucideIcon;
  color?: string;
  targetPath: string;
}

export const KAPROG_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'jurusan',
    label: 'Jurusan',
    shortLabel: 'Jurusan',
    icon: LayoutDashboard,
  },
  {
    id: 'pembinaan',
    label: 'Pembinaan',
    shortLabel: 'Pembinaan',
    icon: ShieldAlert,
  },
  {
    id: 'pkl',
    label: 'PKL',
    shortLabel: 'PKL',
    icon: Briefcase,
  },
  {
    id: 'asesmen',
    label: 'Asesmen',
    shortLabel: 'Asesmen',
    icon: Award,
  },
];

export const KAPROG_SUBTABS_BASE: KaprogTabDefinition[] = [
  // Kategori 1: MANAJEMEN JURUSAN
  { id: 'beranda', label: 'Ringkasan', shortLabel: 'Ringkasan', category: 'jurusan', icon: LayoutDashboard, targetPath: '/dashboard?tab=kaprog&subtab=beranda', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'siswa', label: 'Siswa', shortLabel: 'Siswa', category: 'jurusan', icon: GraduationCap, targetPath: '/dashboard?tab=kaprog&subtab=siswa', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
  { id: 'guru', label: 'Guru', shortLabel: 'Guru', category: 'jurusan', icon: Users, targetPath: '/dashboard?tab=kaprog&subtab=guru', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
  { id: 'sarana', label: 'Sarana', shortLabel: 'Sarana', category: 'jurusan', icon: Wrench, targetPath: '/dashboard?tab=kaprog&subtab=sarana', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },

  // Kategori 2: PEMBINAAN ROMBEL (Operasional Harian)
  { id: 'kehadiran', label: 'Presensi', shortLabel: 'Presensi', category: 'pembinaan', icon: CalendarCheck, targetPath: '/dashboard?tab=kaprog&subtab=kehadiran', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
  { id: 'pelanggaran', label: 'Pelanggaran', shortLabel: 'Pelanggaran', category: 'pembinaan', icon: ShieldAlert, targetPath: '/dashboard?tab=kaprog&subtab=pelanggaran', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
  { id: 'prestasi', label: 'Prestasi', shortLabel: 'Prestasi', category: 'pembinaan', icon: Trophy, targetPath: '/dashboard?tab=kaprog&subtab=prestasi', color: 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400' },

  // Kategori 3: PRAKTIK KERJA LAPANGAN (PKL)
  { id: 'pkl', label: 'Formulasi', shortLabel: 'Formulasi', category: 'pkl', icon: Briefcase, targetPath: '/dashboard?tab=kaprog&subtab=pkl', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'ploting_pkl', label: 'Ploting', shortLabel: 'Ploting', category: 'pkl', icon: UserCheck, targetPath: '/dashboard?tab=kaprog&subtab=ploting_pkl', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'presensi_pkl', label: 'Absensi', shortLabel: 'Absensi', category: 'pkl', icon: CalendarCheck, targetPath: '/dashboard?tab=kaprog&subtab=presensi_pkl', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'nilai_pkl', label: 'Penilaian', shortLabel: 'Penilaian', category: 'pkl', icon: ClipboardCheck, targetPath: '/dashboard?tab=kaprog&subtab=nilai_pkl', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'ploting_penguji', label: 'Penguji', shortLabel: 'Penguji', category: 'pkl', icon: Users, targetPath: '/dashboard?tab=kaprog&subtab=ploting_penguji', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'sidang_pkl', label: 'Sidang', shortLabel: 'Sidang', category: 'pkl', icon: Scale, targetPath: '/dashboard?tab=kaprog&subtab=sidang_pkl', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },

  // Kategori 4: ASESMEN & SERTIFIKASI
  { id: 'ukk', label: 'UKK', shortLabel: 'UKK', category: 'asesmen', icon: Award, targetPath: '/dashboard?tab=kaprog&subtab=ukk', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
  { id: 'rapor', label: 'Rapor', shortLabel: 'Rapor', category: 'asesmen', icon: Printer, targetPath: '/dashboard?tab=kaprog&subtab=rapor', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
];

export interface KaprogTabBadges {
  saranaRusak?: number;
  atRiskStudents?: number;
  pelanggaran?: number;
  pendingMitra?: number;
  belumNilaiDudi?: number;
  belumSidang?: number;
}

export function getKaprogNavTabs(badges?: KaprogTabBadges): NavTabItem[] {
  return KAPROG_SUBTABS_BASE.map((tab) => {
    let badge: number | undefined;
    if (tab.id === 'sarana' && badges?.saranaRusak && badges.saranaRusak > 0) badge = badges.saranaRusak;
    if (tab.id === 'kehadiran' && badges?.atRiskStudents && badges.atRiskStudents > 0) badge = badges.atRiskStudents;
    if (tab.id === 'pelanggaran' && badges?.pelanggaran && badges.pelanggaran > 0) badge = badges.pelanggaran;
    if (tab.id === 'pkl' && badges?.pendingMitra && badges.pendingMitra > 0) badge = badges.pendingMitra;
    if (tab.id === 'nilai_pkl' && badges?.belumNilaiDudi && badges.belumNilaiDudi > 0) badge = badges.belumNilaiDudi;
    if (tab.id === 'ploting_penguji' && badges?.belumSidang && badges.belumSidang > 0) badge = badges.belumSidang;

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

export function getKaprogMobileChildren(): KaprogMobileChildItem[] {
  return KAPROG_SUBTABS_BASE.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
