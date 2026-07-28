// ─── src/components/attendance/rekap/types.ts ────────────────────────────────
// Tipe data bersama untuk modul Rekap Bulanan Kelas

export interface RekapBulananKelasRow {
  siswa_id: string;
  nama_siswa: string;
  nis?: string;
  HADIR?: number;
  IZIN?: number;
  SAKIT?: number;
  ALPA?: number;
  TERLAMBAT?: number;
  total_poin?: number;
  dailyMap?: Record<string, string>;
}

export type ViewMode = 'SUMMARY' | 'MATRIX';
