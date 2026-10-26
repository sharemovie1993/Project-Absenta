import React from 'react';

export type KurikulumTabId =
  | 'ringkasan'
  | 'jadwal'
  | 'guru_mapel'
  | 'struktur'
  | 'piket'
  | 'perangkat'
  | 'supervisi'
  | 'rapor';

export interface KurikulumNavTabItem {
  id: KurikulumTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface KurikulumQuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  tabTarget?: KurikulumTabId;
  href?: string;
  onClick?: () => void;
  badge?: string;
}

export interface TeacherLoadItem {
  id: string;
  nama: string;
  nip?: string;
  jp: number;
  mapelCount?: number;
  status: 'normal' | 'overload' | 'underload';
}

export interface KurikulumStats {
  totalGuru: number;
  totalKelas: number;
  totalMapel: number;
  totalJpMinggu: number;
  activeSemesterNama: string;
  activeTahunPelajaran: string;
  overloadCount: number;
  underloadCount: number;
  conflictCount: number;
  perangkatPct: number;
  supervisiPct: number;
}
