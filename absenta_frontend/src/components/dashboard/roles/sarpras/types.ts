import React from 'react';

export type SarprasTabId =
  | 'ringkasan'
  | 'inventaris'
  | 'peminjaman'
  | 'perbaikan'
  | 'katalog'
  | 'rekap';

export interface SarprasNavTabItem {
  id: SarprasTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface SarprasStats {
  total: number;
  available: number;
  borrowed: number;
  repair: number;
  jurisdiction?: {
    type: string;
    name: string;
  };
}
