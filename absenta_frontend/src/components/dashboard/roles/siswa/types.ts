import React from 'react';

export type SiswaTabId = 'ringkasan' | 'pkl' | 'portal' | 'kehadiran' | 'catatan' | 'berkas' | 'profil';

export interface SiswaNavTabItem {
  id: SiswaTabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number | string | null;
}

export interface StudentBadge {
  key: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

export interface SiswaDisciplineItem {
  id: string;
  judul: string;
  kategori: string;
  tanggal?: string;
  poin: number;
  type: 'prestasi' | 'pelanggaran';
}

export interface SiswaGamification {
  points: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  attendanceRate: number;
  streakDays: number;
  badgeLabel: string;
  badgeColor: string;
}

export interface SiswaMonthStats {
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
}
