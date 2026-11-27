import React from 'react';
import type { CoopManagementStats } from '@/components/cooperative/dashboard/types';

export type KoperasiTabId =
  | 'ringkasan'
  | 'pos'
  | 'anggota'
  | 'simpanan'
  | 'pinjaman'
  | 'pemasok'
  | 'produk'
  | 'voucher'
  | 'laporan_penjualan'
  | 'laporan_stok'
  | 'kas_bank'
  | 'coa'
  | 'aset'
  | 'akuntansi'
  | 'shu'
  | 'rat'
  | 'pengumuman'
  | 'tiket'
  | 'langganan'
  | 'pengaturan'
  | 'delegasi_ketua';

export interface KoperasiNavTabItem {
  id: KoperasiTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
  dividerBefore?: boolean;
}

export type { CoopManagementStats as KoperasiStats };
