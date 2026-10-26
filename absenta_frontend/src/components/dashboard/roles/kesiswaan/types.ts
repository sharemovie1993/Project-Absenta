import React from 'react';

export type KesiswaanTabId =
  | 'ringkasan'
  | 'pelanggaran'
  | 'prestasi'
  | 'dhuha'
  | 'ketarunaan'
  | 'tatib'
  | 'rekap';

export interface KesiswaanNavTabItem {
  id: KesiswaanTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface KesiswaanStats {
  today: number;
  severe: number;
  totalPoints: number;
  needDiscipline: number;
  totalPrestasi: number;
  dhuhaAttendancePct: number;
}
