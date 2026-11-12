import React from 'react';

export type KurikulumTabId =
  | 'ringkasan'
  | 'delegasi'
  | 'rekap_kbm'
  | 'perangkat'
  | 'supervisi'
  | 'evaluasi_kinerja'
  | 'sosialisasi'
  | 'rapor'
  | 'titimangsa_rapor'
  | 'kalender'
  | 'jam_kbm'
  | 'aturan_absensi'
  | 'struktur'
  | 'guru_mapel'
  | 'wali_kelas'
  | 'jadwal'
  | 'piket'
  | 'cbt'
  | 'cetak'
  | 'struktur_organisasi';

export interface KurikulumNavTabItem {
  id: KurikulumTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  category: 'operasional' | 'persiapan';
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
