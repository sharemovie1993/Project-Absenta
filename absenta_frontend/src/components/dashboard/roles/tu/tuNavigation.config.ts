import {
  LayoutDashboard,
  Inbox,
  Send,
  FileText,
  ArrowLeftRight,
  Award,
  FileSpreadsheet,
  BookOpen,
  Users,
  Database,
  Network,
  type LucideIcon,
} from 'lucide-react';
import type { TuTabId, TuNavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export interface TuTabDefinition {
  id: TuTabId;
  label: string;
  shortLabel: string;
  category: 'persuratan' | 'administrasi';
  icon: LucideIcon;
  color?: string;
  targetPath: string;
}

export interface TuMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
  badge?: string | number | null;
}

export const TU_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'persuratan',
    label: 'Persuratan & Pelayanan',
    shortLabel: 'Persuratan',
    icon: Inbox,
  },
  {
    id: 'administrasi',
    label: 'Administrasi & Kepegawaian',
    shortLabel: 'Administrasi',
    icon: FileSpreadsheet,
  },
];

export const TU_SUBTABS_BASE: TuTabDefinition[] = [
  // 📬 KATEGORI 1: PERSURATAN & PELAYANAN
  { id: 'beranda', label: 'Ringkasan', shortLabel: 'Ringkasan', category: 'persuratan', icon: LayoutDashboard, targetPath: '/dashboard?tab=kepegawaian&subtab=beranda', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
  { id: 'surat-masuk', label: 'Masuk', shortLabel: 'Masuk', category: 'persuratan', icon: Inbox, targetPath: '/dashboard?tab=kepegawaian&subtab=surat-masuk', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
  { id: 'surat-keluar', label: 'Keluar', shortLabel: 'Keluar', category: 'persuratan', icon: Send, targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keluar', color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400' },
  { id: 'surat-keterangan', label: 'Keterangan', shortLabel: 'Keterangan', category: 'persuratan', icon: FileText, targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keterangan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
  { id: 'mutasi', label: 'Mutasi', shortLabel: 'Mutasi', category: 'persuratan', icon: ArrowLeftRight, targetPath: '/dashboard?tab=kepegawaian&subtab=mutasi', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
  { id: 'bast-ijazah', label: 'Clearance', shortLabel: 'Clearance', category: 'persuratan', icon: Award, targetPath: '/dashboard?tab=kepegawaian&subtab=bast-ijazah', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },

  // 📂 KATEGORI 2: ADMINISTRASI & KEPEGAWAIAN
  { id: 'dkn', label: 'DKN', shortLabel: 'DKN', category: 'administrasi', icon: FileSpreadsheet, targetPath: '/dashboard?tab=kepegawaian&subtab=dkn', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
  { id: 'buku-induk', label: 'Klapper', shortLabel: 'Klapper', category: 'administrasi', icon: BookOpen, targetPath: '/dashboard?tab=kepegawaian&subtab=buku-induk', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
  { id: 'kepegawaian', label: 'PTK', shortLabel: 'PTK', category: 'administrasi', icon: Users, targetPath: '/dashboard?tab=kepegawaian&subtab=kepegawaian', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
  { id: 'dapodik', label: 'Dapodik', shortLabel: 'Dapodik', category: 'administrasi', icon: Database, targetPath: '/dashboard?tab=kepegawaian&subtab=dapodik', color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400' },
  { id: 'struktur_organisasi', label: 'Organisasi', shortLabel: 'Organisasi', category: 'administrasi', icon: Network, targetPath: '/dashboard?tab=kepegawaian&subtab=struktur_organisasi', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
];

export interface TuTabBadges {
  suratMasukBaru?: number;
  suratKeluarDraft?: number;
  suratKeteranganBulanIni?: number;
  mutasiTotal?: number;
  sisaIjazah?: number;
  totalSiswaAktif?: number;
  totalPtk?: number;
}

export function getTuNavTabs(badges?: TuTabBadges): (TuNavTabItem & { category: string })[] {
  return TU_SUBTABS_BASE.map((tab) => {
    let badge: string | number | undefined;

    if (tab.id === 'surat-masuk' && badges?.suratMasukBaru && badges.suratMasukBaru > 0) {
      badge = badges.suratMasukBaru;
    }
    if (tab.id === 'surat-keluar' && badges?.suratKeluarDraft && badges.suratKeluarDraft > 0) {
      badge = badges.suratKeluarDraft;
    }
    if (tab.id === 'surat-keterangan' && badges?.suratKeteranganBulanIni && badges.suratKeteranganBulanIni > 0) {
      badge = badges.suratKeteranganBulanIni;
    }
    if (tab.id === 'mutasi' && badges?.mutasiTotal && badges.mutasiTotal > 0) {
      badge = badges.mutasiTotal;
    }
    if (tab.id === 'bast-ijazah' && badges?.sisaIjazah && badges.sisaIjazah > 0) {
      badge = badges.sisaIjazah;
    }
    if (tab.id === 'buku-induk' && badges?.totalSiswaAktif !== undefined) {
      badge = badges.totalSiswaAktif;
    }
    if (tab.id === 'kepegawaian' && badges?.totalPtk && badges.totalPtk > 0) {
      badge = badges.totalPtk;
    }

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

export function getTuMobileChildren(): TuMobileChildItem[] {
  return TU_SUBTABS_BASE.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
