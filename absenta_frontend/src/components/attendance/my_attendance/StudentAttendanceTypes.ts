/**
 * 📋 Student Attendance Types & Interfaces
 */

export interface StudentAttendanceRecord {
  id: string;
  nama: string;
  nama_siswa?: string;
  nama_kelas?: string;
  total_poin: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  terlambat: number;
  persentase: number;
  is_me?: boolean;
}

export interface StudentDailyDetail {
  id?: string;
  tanggal?: string;
  created_at?: string;
  status: string;
  waktu_tap?: string | null;
  jam_masuk?: string | null;
  jam_pulang?: string | null;
  keterangan?: string | null;
}

export interface StudentAttendanceRecapData {
  nama_siswa?: string;
  kelas_id?: string;
  persentase_kehadiran?: number;
  total_poin?: number;
  statistik?: {
    HADIR: number;
    IZIN: number;
    SAKIT: number;
    ALPA: number;
    TERLAMBAT: number;
    DISPEN?: number;
  };
  detail?: StudentDailyDetail[];
}

export interface IzinFormData {
  jenis: 'SAKIT' | 'IZIN' | 'DISPEN';
  tanggalMulai: string;
  tanggalSelesai: string;
  alasan: string;
  fileSuratUrl?: string;
}
