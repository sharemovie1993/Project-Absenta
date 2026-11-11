import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  Users,
  Package,
  TrendingUp,
  BookOpen,
  Building2,
  Vote,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { KoperasiTabId, KoperasiNavTabItem } from './types';
import type { UniversalSubtabCategory } from '../common';

export type KoperasiTabCategory = 'ringkasan' | 'ritel' | 'keuangan' | 'organisasi';

export interface KoperasiTabDefinition {
  id: KoperasiTabId;
  label: string;
  shortLabel: string;
  category: KoperasiTabCategory;
  icon: LucideIcon;
  color?: string;
  targetPath: string;
  /** Jika diisi, user wajib memiliki minimal salah satu capability berikut */
  anyOfCapabilities?: string[];
}

export interface KoperasiMobileChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  category?: string;
  icon: LucideIcon;
  targetPath: string;
  color?: string;
  badge?: string | number | null;
}

export const KOPERASI_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'ringkasan',
    label: 'Ringkasan & Layanan',
    shortLabel: 'Utama',
    icon: LayoutDashboard,
  },
  {
    id: 'ritel',
    label: 'Toko & Ritel POS',
    shortLabel: 'Toko',
    icon: Receipt,
  },
  {
    id: 'keuangan',
    label: 'Simpan Pinjam & Keuangan',
    shortLabel: 'Keuangan',
    icon: Wallet,
  },
  {
    id: 'organisasi',
    label: 'Keanggotaan & Tata Kelola',
    shortLabel: 'Organisasi',
    icon: Vote,
  },
];

/**
 * Definisi canonical seluruh subtab Koperasi dipetakan terhadap
 * position-capabilities.ts untuk 5 posisi pengurus Koperasi:
 * KETUA_KOPERASI, BENDAHARA_KOPERASI, SEKRETARIS_KOPERASI,
 * MANAJER_TOKO_KOPERASI, PENGAWAS_KOPERASI.
 */
export const KOPERASI_SUBTABS_BASE: KoperasiTabDefinition[] = [
  {
    id: 'ringkasan',
    label: 'Ringkasan',
    shortLabel: 'Beranda',
    category: 'ringkasan',
    icon: LayoutDashboard,
    targetPath: '/dashboard?tab=koperasi&subtab=ringkasan',
    color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'pos',
    label: 'Kasir POS',
    shortLabel: 'Kasir',
    category: 'ritel',
    icon: Receipt,
    targetPath: '/dashboard?tab=koperasi&subtab=pos',
    color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
    anyOfCapabilities: ['cooperative.store.orders.manage', 'coop.pos.access'],
  },
  {
    id: 'produk',
    label: 'Katalog & Stok',
    shortLabel: 'Katalog',
    category: 'ritel',
    icon: Package,
    targetPath: '/dashboard?tab=koperasi&subtab=produk',
    color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
    anyOfCapabilities: [
      'cooperative.store.products.view.list',
      'cooperative.store.view.catalog',
      'cooperative.store.products.create',
      'cooperative.store.inventory.manage',
    ],
  },
  {
    id: 'simpanan',
    label: 'Simpanan',
    shortLabel: 'Simpanan',
    category: 'keuangan',
    icon: Wallet,
    targetPath: '/dashboard?tab=koperasi&subtab=simpanan',
    color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
    anyOfCapabilities: [
      'cooperative.savings.view.list',
      'cooperative.savings.deposit',
      'cooperative.savings.withdraw',
      'cooperative.savings.create',
    ],
  },
  {
    id: 'pinjaman',
    label: 'Pinjaman',
    shortLabel: 'Pinjaman',
    category: 'keuangan',
    icon: PiggyBank,
    targetPath: '/dashboard?tab=koperasi&subtab=pinjaman',
    color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
    anyOfCapabilities: [
      'cooperative.loans.view.list',
      'cooperative.loans.approve',
      'cooperative.loans.repay',
    ],
  },
  {
    id: 'shu',
    label: 'SHU',
    shortLabel: 'SHU',
    category: 'keuangan',
    icon: TrendingUp,
    targetPath: '/dashboard?tab=koperasi&subtab=shu',
    color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
    anyOfCapabilities: [
      'cooperative.shu.view.report',
      'cooperative.shu.calculate',
      'cooperative.shu.approve',
      'cooperative.shu.manage',
    ],
  },
  {
    id: 'akuntansi',
    label: 'Akuntansi',
    shortLabel: 'Akuntansi',
    category: 'keuangan',
    icon: BookOpen,
    targetPath: '/dashboard?tab=koperasi&subtab=akuntansi',
    color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
    anyOfCapabilities: [
      'cooperative.reports.view.financial',
      'cooperative.reports.view.daily',
      'cooperative.reports.view.monthly',
    ],
  },
  {
    id: 'anggota',
    label: 'Anggota',
    shortLabel: 'Anggota',
    category: 'organisasi',
    icon: Users,
    targetPath: '/dashboard?tab=koperasi&subtab=anggota',
    color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
    anyOfCapabilities: [
      'cooperative.members.view.list',
      'cooperative.members.create',
      'cooperative.members.update',
      'cooperative.members.activate',
      'cooperative.members.manage',
    ],
  },
  {
    id: 'aset',
    label: 'Aset Koperasi',
    shortLabel: 'Aset',
    category: 'organisasi',
    icon: Building2,
    targetPath: '/dashboard?tab=koperasi&subtab=aset',
    color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
    anyOfCapabilities: [
      'cooperative.assets.view.list',
      'cooperative.assets.create',
      'cooperative.assets.update',
      'cooperative.assets.manage',
    ],
  },
  {
    id: 'rat',
    label: 'Sidang RAT',
    shortLabel: 'RAT',
    category: 'organisasi',
    icon: Vote,
    targetPath: '/dashboard?tab=koperasi&subtab=rat',
    color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
    anyOfCapabilities: [
      'cooperative.rat.view',
      'cooperative.rat.manage',
      'cooperative.rat.vote',
    ],
  },
  {
    id: 'tiket',
    label: 'Tiket & Aduan',
    shortLabel: 'Tiket',
    category: 'ringkasan',
    icon: MessageSquare,
    targetPath: '/dashboard?tab=koperasi&subtab=tiket',
    color: 'bg-orange-50 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400',
    anyOfCapabilities: [
      'cooperative.tickets.view.list',
      'cooperative.tickets.manage',
      'cooperative.tickets.reply',
    ],
  },
];

export interface KoperasiTabBadges {
  dueInstallments?: number;
  pendingMembers?: number;
  criticalStock?: number;
  openTickets?: number;
}

export function hasKoperasiTabAccess(
  tab: KoperasiTabDefinition,
  canFn?: (capability: string) => boolean
): boolean {
  if (!canFn || !tab.anyOfCapabilities || tab.anyOfCapabilities.length === 0) {
    return true;
  }
  return tab.anyOfCapabilities.some((cap) => canFn(cap));
}

export function getKoperasiNavTabs(
  badges?: KoperasiTabBadges,
  canFn?: (capability: string) => boolean
): (KoperasiNavTabItem & { category: KoperasiTabCategory })[] {
  return KOPERASI_SUBTABS_BASE.filter((tab) => hasKoperasiTabAccess(tab, canFn))?.map((tab) => {
    let badge: string | undefined;
    let badgeColor: string | undefined;

    if (tab.id === 'pinjaman' && badges?.dueInstallments && badges.dueInstallments > 0) {
      badge = `${badges.dueInstallments}`;
      badgeColor = 'bg-amber-500 text-white';
    } else if (tab.id === 'anggota' && badges?.pendingMembers && badges.pendingMembers > 0) {
      badge = `${badges.pendingMembers}`;
      badgeColor = 'bg-blue-500 text-white';
    } else if (tab.id === 'produk' && badges?.criticalStock && badges.criticalStock > 0) {
      badge = `${badges.criticalStock}`;
      badgeColor = 'bg-rose-500 text-white';
    } else if (tab.id === 'tiket' && badges?.openTickets && badges.openTickets > 0) {
      badge = `${badges.openTickets}`;
      badgeColor = 'bg-orange-500 text-white';
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

export function getVisibleKoperasiCategories(
  tabs: Array<{ category: string }>
): UniversalSubtabCategory[] {
  const activeIds = new Set(tabs?.map((t) => t.category) || []);
  return KOPERASI_CATEGORIES.filter((cat) => activeIds.has(cat.id));
}

export function getKoperasiMobileChildren(
  canFn?: (capability: string) => boolean
): KoperasiMobileChildItem[] {
  return KOPERASI_SUBTABS_BASE.filter((tab) => hasKoperasiTabAccess(tab, canFn))?.map((tab) => ({
    id: tab.id,
    label: tab.label,
    shortLabel: tab.shortLabel,
    category: tab.category,
    icon: tab.icon,
    targetPath: tab.targetPath,
    color: tab.color,
  }));
}
