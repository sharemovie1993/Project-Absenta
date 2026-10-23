import React from 'react';

export type TuTabId =
  | 'beranda'
  | 'buku-induk'
  | 'surat-keterangan'
  | 'mutasi'
  | 'bast-ijazah'
  | 'dkn';

export interface TuNavTabItem {
  id: TuTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export interface TuStatsData {
  konteksAkademik?: {
    tahunPelajaran?: string;
    tahunPelajaranId?: string | null;
    semester?: string;
    semesterId?: string | null;
  };
  bukuInduk?: {
    totalSiswaAktif?: number;
  };
  persuratan?: {
    totalSuratBulanIni?: number;
    suratKeteranganBulanIni?: number;
  };
  mutasi?: {
    keluar?: number;
    masuk?: number;
    total?: number;
  };
  ijazah?: {
    totalLulusan?: number;
    sudahDiserahkan?: number;
    sisaBrankas?: number;
    persentaseDiambil?: number;
  };
  dkn?: {
    totalArsip?: number;
  };
  recentActivities?: Array<{
    id: string;
    nomor_surat: string;
    title: string;
    kategori: string;
    tujuan: string;
    tanggal: string;
    status: string;
  }>;
}
