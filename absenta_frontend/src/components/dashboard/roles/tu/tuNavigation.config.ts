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
  Wallet,
  Package,
  Wrench,
  Map,
  Network,
  type LucideIcon,
} from 'lucide-react';
import type { TuTabId, TuNavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export type TuTabCategory = 'persuratan' | 'administrasi' | 'keuangan' | 'sarpras';

export interface TuTabDefinition {
  id: TuTabId;
  label: string;
  shortLabel: string;
  category: TuTabCategory;
  icon: LucideIcon;
  color?: string;
  targetPath: string;
  /** Jika diisi, user wajib memiliki minimal salah satu capability berikut */
  anyOfCapabilities?: string[];
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
  {
    id: 'keuangan',
    label: 'Keuangan & SPP Sekolah',
    shortLabel: 'Keuangan',
    icon: Wallet,
  },
  {
    id: 'sarpras',
    label: 'Logistik & Inventaris KIB',
    shortLabel: 'Sarpras',
    icon: Package,
  },
];

export const TU_SUBTABS_BASE: TuTabDefinition[] = [
  // 📬 KATEGORI 1: PERSURATAN & PELAYANAN
  {
    id: 'beranda',
    label: 'Ringkasan',
    shortLabel: 'Ringkasan',
    category: 'persuratan',
    icon: LayoutDashboard,
    targetPath: '/dashboard?tab=kepegawaian&subtab=beranda',
    color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400',
  },
  {
    id: 'surat-masuk',
    label: 'Surat Masuk',
    shortLabel: 'Masuk',
    category: 'persuratan',
    icon: Inbox,
    targetPath: '/dashboard?tab=kepegawaian&subtab=surat-masuk',
    color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
    anyOfCapabilities: ['correspondence.inbox.view', 'correspondence.inbox.manage'],
  },
  {
    id: 'surat-keluar',
    label: 'Surat Keluar',
    shortLabel: 'Keluar',
    category: 'persuratan',
    icon: Send,
    targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keluar',
    color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400',
    anyOfCapabilities: ['correspondence.outbox.view', 'correspondence.outbox.manage', 'correspondence.outbox.sign'],
  },
  {
    id: 'surat-keterangan',
    label: 'Keterangan',
    shortLabel: 'Keterangan',
    category: 'persuratan',
    icon: FileText,
    targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keterangan',
    color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
    anyOfCapabilities: ['correspondence.outbox.view', 'correspondence.outbox.manage'],
  },
  {
    id: 'mutasi',
    label: 'Mutasi',
    shortLabel: 'Mutasi',
    category: 'persuratan',
    icon: ArrowLeftRight,
    targetPath: '/dashboard?tab=kepegawaian&subtab=mutasi',
    color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
    anyOfCapabilities: ['correspondence.outbox.view', 'academic.transitions.manage'],
  },
  {
    id: 'bast-ijazah',
    label: 'Clearance',
    shortLabel: 'Clearance',
    category: 'persuratan',
    icon: Award,
    targetPath: '/dashboard?tab=kepegawaian&subtab=bast-ijazah',
    color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
    anyOfCapabilities: ['correspondence.outbox.view'],
  },

  // 📂 KATEGORI 2: ADMINISTRASI & KEPEGAWAIAN
  {
    id: 'dkn',
    label: 'DKN',
    shortLabel: 'DKN',
    category: 'administrasi',
    icon: FileSpreadsheet,
    targetPath: '/dashboard?tab=kepegawaian&subtab=dkn',
    color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
    anyOfCapabilities: ['correspondence.outbox.view', 'academic.dapodik.view'],
  },
  {
    id: 'buku-induk',
    label: 'Klapper',
    shortLabel: 'Klapper',
    category: 'administrasi',
    icon: BookOpen,
    targetPath: '/dashboard?tab=kepegawaian&subtab=buku-induk',
    color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
    anyOfCapabilities: ['academic.students.manage', 'academic.dapodik.view'],
  },
  {
    id: 'kepegawaian',
    label: 'PTK',
    shortLabel: 'PTK',
    category: 'administrasi',
    icon: Users,
    targetPath: '/dashboard?tab=kepegawaian&subtab=kepegawaian',
    color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
    anyOfCapabilities: ['academic.teachers.manage', 'tu.staff.view.list'],
  },
  {
    id: 'dapodik',
    label: 'Dapodik',
    shortLabel: 'Dapodik',
    category: 'administrasi',
    icon: Database,
    targetPath: '/dashboard?tab=kepegawaian&subtab=dapodik',
    color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
    anyOfCapabilities: ['academic.dapodik.view', 'academic.dapodik.manage'],
  },

  // 💰 KATEGORI 3: KEUANGAN & SPP SEKOLAH
  {
    id: 'keuangan-spp',
    label: 'Keuangan SPP',
    shortLabel: 'SPP',
    category: 'keuangan',
    icon: Wallet,
    targetPath: '/dashboard?tab=kepegawaian&subtab=keuangan-spp',
    color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
    anyOfCapabilities: ['tu.finance.invoices.view.list', 'tu.finance.payments.view.history', 'tu.finance.reports.view'],
  },

  // 📦 KATEGORI 4: LOGISTIK & INVENTARIS SARPRAS TU
  {
    id: 'sarpras-inventaris',
    label: 'Inventaris KIB',
    shortLabel: 'Inventaris',
    category: 'sarpras',
    icon: Package,
    targetPath: '/dashboard?tab=kepegawaian&subtab=sarpras-inventaris',
    color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
    anyOfCapabilities: ['sarpras.inventory.view.list', 'sarpras.inventory.manage'],
  },
  {
    id: 'sarpras-peminjaman',
    label: 'Peminjaman',
    shortLabel: 'Pinjam',
    category: 'sarpras',
    icon: ArrowLeftRight,
    targetPath: '/dashboard?tab=kepegawaian&subtab=sarpras-peminjaman',
    color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
    anyOfCapabilities: ['sarpras.loans.view.list', 'sarpras.loans.manage'],
  },
  {
    id: 'sarpras-perbaikan',
    label: 'Perbaikan',
    shortLabel: 'Servis',
    category: 'sarpras',
    icon: Wrench,
    targetPath: '/dashboard?tab=kepegawaian&subtab=sarpras-perbaikan',
    color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
    anyOfCapabilities: ['sarpras.repairs.view.list', 'sarpras.repairs.manage'],
  },
  {
    id: 'sarpras-denah',
    label: 'Denah Aset',
    shortLabel: 'Denah',
    category: 'sarpras',
    icon: Map,
    targetPath: '/dashboard?tab=kepegawaian&subtab=sarpras-denah',
    color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
    anyOfCapabilities: ['sarpras.denah.view', 'sarpras.denah.manage'],
  },

  {
    id: 'struktur_organisasi',
    label: 'Organisasi',
    shortLabel: 'Organisasi',
    category: 'administrasi',
    icon: Network,
    targetPath: '/dashboard?tab=kepegawaian&subtab=struktur_organisasi',
    color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
    anyOfCapabilities: ['academic.structures.view.list', 'academic.structure.manage'],
  },
  {
    id: 'sosialisasi',
    label: 'Rapat Sosialisasi',
    shortLabel: 'Sosialisasi',
    category: 'administrasi',
    icon: Users,
    targetPath: '/dashboard?tab=kepegawaian&subtab=sosialisasi',
    color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
    // Universal Access: Terbuka untuk seluruh staf TU tanpa terkecuali
  },
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

export function hasTuTabAccess(
  tab: TuTabDefinition,
  canFn?: (capability: string) => boolean
): boolean {
  if (!canFn || !tab.anyOfCapabilities || tab.anyOfCapabilities.length === 0) {
    return true;
  }
  return tab.anyOfCapabilities.some((cap) => canFn(cap));
}

export function getTuNavTabs(
  badges?: TuTabBadges,
  canFn?: (capability: string) => boolean
): (TuNavTabItem & { category: TuTabCategory })[] {
  return TU_SUBTABS_BASE.filter((tab) => hasTuTabAccess(tab, canFn))?.map((tab) => {
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

export function getVisibleTuCategories(
  tabs: Array<{ category: string }>
): UniversalSubtabCategory[] {
  const activeIds = new Set(tabs?.map((t) => t.category) || []);
  return TU_CATEGORIES.filter((cat) => activeIds.has(cat.id));
}

export function getTuMobileChildren(
  canFn?: (capability: string) => boolean
): TuMobileChildItem[] {
  return TU_SUBTABS_BASE.filter((tab) => hasTuTabAccess(tab, canFn))?.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
