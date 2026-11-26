import {
  LayoutDashboard,
  Receipt,
  Wallet,
  HeartHandshake,
  Users,
  Package,
  Award,
  BookOpen,
  Building2,
  Vote,
  MessageSquare,
  Tag,
  BarChart3,
  ClipboardList,
  Landmark,
  FolderTree,
  Boxes,
  Bell,
  Settings,
  CreditCard,
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
  dividerBefore?: boolean;
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
 * Definisi canonical seluruh subtab Koperasi yang diselaraskan 100%
 * dengan struktur menu Single-Page Koperasi dan dipetakan terhadap
 * position-capabilities.ts untuk 5 posisi pengurus Koperasi:
 * KETUA_KOPERASI, BENDAHARA_KOPERASI, SEKRETARIS_KOPERASI,
 * MANAJER_TOKO_KOPERASI, PENGAWAS_KOPERASI.
 */
export const KOPERASI_SUBTABS_BASE: KoperasiTabDefinition[] = [
  {
    id: 'ringkasan',
    label: 'Dashboard',
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
    id: 'anggota',
    label: 'Data Anggota',
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
    icon: HeartHandshake,
    targetPath: '/dashboard?tab=koperasi&subtab=pinjaman',
    color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
    anyOfCapabilities: [
      'cooperative.loans.view.list',
      'cooperative.loans.approve',
      'cooperative.loans.repay',
    ],
  },
  {
    id: 'pemasok',
    label: 'Data Pemasok',
    shortLabel: 'Pemasok',
    category: 'ritel',
    icon: Building2,
    targetPath: '/dashboard?tab=koperasi&subtab=pemasok',
    color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400',
    anyOfCapabilities: [
      'cooperative.suppliers.view.list',
      'cooperative.suppliers.manage',
    ],
  },
  {
    id: 'produk',
    label: 'Data Barang',
    shortLabel: 'Barang',
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
    id: 'voucher',
    label: 'Voucher & Promo',
    shortLabel: 'Voucher',
    category: 'ritel',
    icon: Tag,
    targetPath: '/dashboard?tab=koperasi&subtab=voucher',
    color: 'bg-pink-50 dark:bg-pink-950/70 text-pink-600 dark:text-pink-400',
    anyOfCapabilities: [
      'cooperative.vouchers.view.list',
      'cooperative.vouchers.manage',
    ],
  },
  {
    id: 'laporan_penjualan',
    label: 'Laporan Penjualan',
    shortLabel: 'Penjualan',
    category: 'ritel',
    icon: BarChart3,
    targetPath: '/dashboard?tab=koperasi&subtab=laporan_penjualan',
    color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
    anyOfCapabilities: [
      'cooperative.store.transactions.view',
      'cooperative.store.orders.view.list',
      'cooperative.reports.view.financial',
    ],
  },
  {
    id: 'laporan_stok',
    label: 'Laporan Stok',
    shortLabel: 'Lap. Stok',
    category: 'ritel',
    icon: ClipboardList,
    targetPath: '/dashboard?tab=koperasi&subtab=laporan_stok',
    color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
    anyOfCapabilities: [
      'cooperative.store.inventory.manage',
      'cooperative.store.products.view.list',
    ],
  },
  {
    id: 'kas_bank',
    label: 'Kas & Bank',
    shortLabel: 'Kas & Bank',
    category: 'keuangan',
    icon: Landmark,
    targetPath: '/dashboard?tab=koperasi&subtab=kas_bank',
    color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
    dividerBefore: true,
    anyOfCapabilities: [
      'cooperative.reports.view.financial',
      'cooperative.reports.view.daily',
      'cooperative.reports.view.monthly',
    ],
  },
  {
    id: 'coa',
    label: 'Bagan Akun (COA)',
    shortLabel: 'Bagan Akun',
    category: 'keuangan',
    icon: FolderTree,
    targetPath: '/dashboard?tab=koperasi&subtab=coa',
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    anyOfCapabilities: [
      'cooperative.reports.view.financial',
      'cooperative.reports.view.daily',
      'cooperative.reports.view.monthly',
    ],
  },
  {
    id: 'aset',
    label: 'Aset Koperasi',
    shortLabel: 'Aset',
    category: 'organisasi',
    icon: Boxes,
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
    id: 'akuntansi',
    label: 'Laporan Keuangan',
    shortLabel: 'Keuangan',
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
    id: 'shu',
    label: 'Sisa Hasil Usaha',
    shortLabel: 'SHU',
    category: 'keuangan',
    icon: Award,
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
    id: 'rat',
    label: 'Rapat Anggota (RAT)',
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
    id: 'pengumuman',
    label: 'Pengumuman',
    shortLabel: 'Pengumuman',
    category: 'ringkasan',
    icon: Bell,
    targetPath: '/dashboard?tab=koperasi&subtab=pengumuman',
    color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
    dividerBefore: true,
    anyOfCapabilities: [
      'cooperative.announcements.view.list',
      'cooperative.announcements.create',
      'cooperative.announcements.delete',
    ],
  },
  {
    id: 'tiket',
    label: 'Pusat Bantuan',
    shortLabel: 'Bantuan',
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
  {
    id: 'langganan',
    label: 'Paket Langganan',
    shortLabel: 'Langganan',
    category: 'organisasi',
    icon: CreditCard,
    targetPath: '/dashboard?tab=koperasi&subtab=langganan',
    color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
    anyOfCapabilities: [
      'billing.my.subscription.view',
      'billing.my.subscription.create',
      'billing.subscriptions.choose.plan',
      'billing.invoices.pay',
    ],
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    shortLabel: 'Pengaturan',
    category: 'organisasi',
    icon: Settings,
    targetPath: '/dashboard?tab=koperasi&subtab=pengaturan',
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    anyOfCapabilities: [
      'cooperative.settings.view',
      'cooperative.settings.update',
      'cooperative.setup.view',
      'cooperative.setup.manage',
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
      dividerBefore: tab.dividerBefore,
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
