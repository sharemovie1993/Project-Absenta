import { z } from 'zod';

export const SummaryFormSchema = z.object({
  sakit: z
    .number({ invalid_type_error: 'Sakit harus angka' })
    .min(0, 'Sakit tidak boleh negatif')
    .max(365),
  izin: z
    .number({ invalid_type_error: 'Izin harus angka' })
    .min(0, 'Izin melebih batas 365 hari')
    .max(365),
  alpa: z
    .number({ invalid_type_error: 'Alpa harus angka' })
    .min(0, 'Alpa tidak boleh negatif')
    .max(365),
  catatan_wali: z
    .string()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional()
    .default(''),
  keputusan_transisi: z
    .string()
    .max(200, 'Keputusan maksimal 200 karakter')
    .optional()
    .default(''),
});

export type SummaryFormData = z.infer<typeof SummaryFormSchema>;

export interface LegerStudent {
  id: string;
  nama_siswa: string;
  nis: string;
  rank: number | string;
  rata_rata: number;
  sakit: number;
  izin: number;
  alpa: number;
  catatan_wali: string;
  keputusan_transisi: string;
  referensi_absensi_harian?: { sakit: number; izin: number; alpa: number };
}

export interface AcademicYear {
  id: string;
  nama: string;
  tahun?: string;
  is_active: boolean;
}

export interface Semester {
  id: string;
  nama: string;
  nama_semester?: string;
  is_active: boolean;
}

export interface RawStudent {
  id: string;
  nama_siswa?: string;
  nama?: string;
  nama_lengkap?: string;
  nis?: string;
  nisn?: string;
  sakit?: number;
  izin?: number;
  alpa?: number;
}

export interface RawLegerEntry {
  id?: string;
  siswa_id?: string;
  rank?: number | string;
  rata_rata?: number;
  sakit?: number;
  izin?: number;
  alpa?: number;
  catatan_wali?: string;
  keputusan_transisi?: string;
  referensi_absensi_harian?: { sakit: number; izin: number; alpa: number };
}

export interface TranskripSubjectEntry {
  mapel_id: string;
  mapel_name: string;
  kelompok_mapel: string;
  semester_scores: Array<{
    semester_id: string;
    semester_nama: string;
    nilai_akhir: number;
  }>;
  rata_rata_mapel: number;
}

export interface TranskripNilaiData {
  siswa: {
    id: string;
    nama_siswa: string;
    nis?: string;
    nisn?: string;
    tingkat?: number;
    kelas?: string;
    jurusan?: string;
  };
  transkrip: TranskripSubjectEntry[];
  ringkasan: {
    total_mapel: number;
    rata_rata_ijazah: number;
    status_kelulusan?: string;
  };
}
