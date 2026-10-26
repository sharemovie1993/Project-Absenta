import React from 'react';
import type { CoopManagementStats } from '@/components/cooperative/dashboard/types';

export type KoperasiTabId =
  | 'ringkasan'
  | 'pos'
  | 'simpanan'
  | 'pinjaman'
  | 'anggota'
  | 'produk'
  | 'shu'
  | 'akuntansi';

export interface KoperasiNavTabItem {
  id: KoperasiTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export type { CoopManagementStats as KoperasiStats };
