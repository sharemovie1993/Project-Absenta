export type SatpamTabType = 'scan' | 'buku_tamu' | 'izin_keluar' | 'pelanggaran' | 'traffic';

export interface SatpamStats {
  totalMasuk: number;
  tepatWaktu: number;
  terlambat: number;
  belumHadir: number;
  tamuDiSekolah: number;
  izinKeluarAktif: number;
  persentaseKehadiran: number;
}

export interface RecentScanRecord {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  jurusan?: string;
  status: 'HADIR' | 'TERLAMBAT' | 'PULANG';
  jam: string;
  foto?: string;
  gate: string;
  keterangan?: string;
}

export interface GuestLogRecord {
  id: string;
  nama_tamu: string;
  instansi?: string;
  keperluan: string;
  menemui: string;
  no_telepon?: string;
  no_identitas?: string;
  nomor_kartu_tamu?: string;
  jam_masuk: string;
  jam_keluar?: string;
  status: 'BERKUNJUNG' | 'SELESAI';
  petugas?: string;
}

export interface StudentGatePermit {
  id: string;
  siswa_id: string;
  nama_siswa: string;
  kelas: string;
  alasan: string;
  jam_keluar_rencana: string;
  jam_kembali_rencana?: string;
  jam_keluar_aktual?: string;
  jam_kembali_aktual?: string;
  guru_piket_nama: string;
  status: 'DISETUJUI' | 'DI_LUAR' | 'KEMBALI' | 'DITOLAK';
}
