import React from 'react';
import type { BpbkDashboardStats } from '@/api/bpbk.api';

export type BpbkTabId =
  | 'ringkasan'
  | 'cases'
  | 'konseling'
  | 'pemanggilan'
  | 'homevisit'
  | 'rujukan'
  | 'asesmen'
  | 'rekap';

export interface BpbkNavTabItem {
  id: BpbkTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export type { BpbkDashboardStats as BpbkStats };
