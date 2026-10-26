import React from 'react';
import type { ExecutivePillar } from '@/store/executivePillarStore';

export type KepsekTabId = 'ringkasan' | 'kbm' | 'kesiswaan' | 'bk' | 'sarpras' | 'hubin' | 'tu';

export interface KepsekNavTabItem {
  id: KepsekTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface MetricBlockItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'teal' | 'cyan' | 'orange';
  subtitle?: string;
  onClick?: () => void;
}
