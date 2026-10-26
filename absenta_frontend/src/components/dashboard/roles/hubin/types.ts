import React from 'react';

export type HubinTabId =
  | 'ringkasan'
  | 'mitra'
  | 'penempatan'
  | 'absensi'
  | 'nilai'
  | 'bkk'
  | 'tracer'
  | 'rekap';

export interface HubinNavTabItem {
  id: HubinTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface HubinStats {
  totalMitra: number;
  mitraActive: number;
  totalPklActive: number;
  totalPklFinished: number;
  totalLowonganBkk: number;
  tracerResponseRate: number;
  mouExpiringSoonCount: number;
}
