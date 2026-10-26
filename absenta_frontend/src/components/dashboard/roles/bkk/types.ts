import React from 'react';

export type BkkTabId = 'ringkasan' | 'loker' | 'pelamar' | 'tracer' | 'mitra' | 'rekap';

export interface BkkNavTabItem {
  id: BkkTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface BkkStats {
  active_jobs?: number;
  total_applicants?: number;
  pending_interviews?: number;
  tracer_absorbed_pct?: number | string;
  total_mitra?: number;
  alumni_working?: number;
  alumni_studying?: number;
  alumni_entrepreneur?: number;
  alumni_seeking?: number;
  recent_jobs?: Array<{
    id: string;
    judul_posisi: string;
    perusahaan_nama: string;
    kuota: number;
    tanggal_tutup: string;
    status?: string;
  }>;
}
