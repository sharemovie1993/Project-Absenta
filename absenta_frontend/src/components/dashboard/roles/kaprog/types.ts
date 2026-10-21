import React from 'react';

export type KaprogTabId = 'beranda' | 'pkl' | 'kehadiran' | 'guru' | 'sarana';

export interface NavTabItem {
  id: KaprogTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export interface KelasKehadiranItem {
  id: string;
  namaKelas: string;
  rawNamaKelas?: string;
  tingkat: string | number;
  waliKelas: string;
  totalSiswa: number;
  hadirCount: number;
  izinCount: number;
  sakitCount: number;
  alfaCount: number;
  persentaseHadir?: number;
  isPkl?: boolean;
  pklCount?: number;
}

export interface ChannelPresensiDetail {
  status: string;
  waktu?: string;
  kegiatan?: string;
  mapel?: string;
  mitra?: string;
  isTerlambat?: boolean;
  isPkl?: boolean;
}

export interface SiswaAtRiskItem {
  id: string;
  nama: string;
  nis?: string;
  kelas: string;
  persentase: number;
  alfaCount: number;
  catatan: string;
  statusHariIni?: string;
  hadirDays?: number;
  totalDays?: number;
  gerbang?: ChannelPresensiDetail;
  pembiasaan?: ChannelPresensiDetail;
  kbm?: ChannelPresensiDetail;
  pkl?: ChannelPresensiDetail;
  isTodayAlfa?: boolean;
}

export interface PelanggaranSiswaItem {
  id: string;
  siswaId: string;
  nama: string;
  nis?: string;
  kelas: string;
  tanggal: string;
  jenisPelanggaran: string;
  poin: number;
  status: 'BARU' | 'PROSES' | 'SELESAI' | 'TERBUKA' | 'RUJUKAN' | string;
  keterangan?: string;
  sumber?: 'TATIB' | 'BK';
}

export interface GuruProduktifItem {
  id: string;
  nama: string;
  nip?: string;
  noHp?: string | null;
  mapel: string;
  jamHariIni: string;
  waktuRentang?: string;
  rawJamMulai?: string;
  status: string;
  ruang?: string;
  isToday?: boolean;
  totalJp?: number;
  sessionStatus?: 'BERLANGSUNG' | 'SELESAI' | 'TERJADWAL';
}

export type GuruSortOption = 'urgent' | 'jam' | 'nama' | 'ruang' | 'mapel';
export type GuruStatusFilter = 'ALL' | 'HADIR' | 'BELUM_MASUK';

export interface SaranaItem {
  id: string;
  nama: string;
  kode: string;
  kategori: string;
  lokasi: string;
  kondisi: 'BAIK' | 'RUSAK' | 'PERBAIKAN';
  status: 'TERSEDIA' | 'DIPINJAM';
  peminjam?: string;
  jumlah?: number;
}

export interface KonteksAkademik {
  tahunPelajaran?: {
    id: string;
    tahun: string;
    is_active: boolean;
  } | null;
  semester?: {
    id: string;
    nama: string;
    semester: string;
    is_active: boolean;
  } | null;
}

export interface ResolvedJurusan {
  id: string;
  nama: string;
  singkatan?: string | null;
  kode?: string | null;
}
