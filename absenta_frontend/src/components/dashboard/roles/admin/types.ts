import React from 'react';

export type AdminTabId =
  | 'ringkasan'
  | 'academic_dashboard'
  | 'audit'
  | 'tahun_pelajaran'
  | 'semester'
  | 'jurusan'
  | 'kelas'
  | 'mapel'
  | 'guru'
  | 'siswa'
  | 'dokumen'
  | 'berkas_ptk'
  | 'jenis_kegiatan'
  | 'struktur_organisasi'
  | 'kenaikan_kelas'
  | 'cetak_berkas'
  | 'users'
  | 'roles'
  | 'sekolah'
  | 'aturan_absensi'
  | 'pengaturan';

export type AdminCategory = 'kontrol' | 'master' | 'keamanan' | 'sistem';

export interface AdminNavTabItem {
  id: AdminTabId;
  label: string;
  shortLabel?: string;
  category: AdminCategory;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  badge?: number | string;
  badgeColor?: string;
}

export interface AdminCategoryConfig {
  id: AdminCategory;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  iconColor?: string;
}
