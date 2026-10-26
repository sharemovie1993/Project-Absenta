import React from 'react';

export type EkskulTabId = 'ringkasan' | 'anggota' | 'nilai' | 'jadwal' | 'rekap';

export interface EkskulNavTabItem {
  id: EkskulTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface EkskulItemSummary {
  id: string;
  nama: string;
  kategori?: string;
  jumlah_anggota?: number;
  jumlah_pembina?: number;
  jadwal_hari?: string;
  jadwal_jam?: string;
  lokasi?: string;
}

export interface EkskulStats {
  total_ekskul?: number;
  total_anggota?: number;
  total_pembina?: number;
  persentase_dinilai?: number;
  kegiatan_aktif?: EkskulItemSummary[];
  jadwal_mingguan?: Array<{
    id: string;
    nama_kegiatan: string;
    hari: string;
    jam_mulai: string;
    jam_selesai?: string;
    lokasi?: string;
    pembina?: string;
  }>;
}
