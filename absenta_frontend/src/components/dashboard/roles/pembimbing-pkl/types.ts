import { LucideIcon } from 'lucide-react';

export type PklTabId =
  | 'ringkasan'
  | 'bimbingan'
  | 'verifikasi_absensi'
  | 'absensi'
  | 'jurnal'
  | 'monitoring'
  | 'penilaian'
  | 'rekap';

export interface PklNavTabItem {
  id: PklTabId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  badge?: number | string;
}

export interface SiswaBimbinganItem {
  id: string;
  siswa_id: string;
  nama_siswa: string;
  nis: string;
  kelas: string;
  mitra_id: string;
  nama_mitra: string;
  alamat_mitra?: string;
  kontak_mitra?: string;
  pembimbing_industri?: string;
  tanggal_mulai: string;
  tanggal_selesai?: string;
  status: 'AKTIF' | 'SELESAI' | 'MUTASI' | 'BATAL' | string;
  total_kehadiran?: number;
  jurnal_pending_count?: number;
  nilai_akhir?: number | null;
  predikat?: string;
}

export interface KunjunganMonitoringItem {
  id: string;
  penempatan_id: string;
  nama_mitra: string;
  tanggal_kunjungan: string;
  tujuan: string;
  catatan_supervisi: string;
  kendala_siswa?: string;
  tindak_lanjut?: string;
  foto_kegiatan_url?: string;
  dibuat_oleh?: string;
}

export interface PklDashboardStats {
  total_siswa_bimbingan: number;
  siswa_aktif: number;
  siswa_selesai: number;
  total_mitra_industri: number;
  absensi_pending_verification?: number;
  jurnal_pending_review: number;
  total_kunjungan_terlaksana: number;
  persentase_dinilai: number;
  siswa_bimbingan_list?: SiswaBimbinganItem[];
  kunjungan_terbaru?: KunjunganMonitoringItem[];
}
