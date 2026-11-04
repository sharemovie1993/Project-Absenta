import { z } from 'zod';
import {
  formatLocalDateTime,
  localDateTimeInputToISO,
} from '@/utils/attendance/time';
import type { CbtBankSoal } from '@/types/cbt.types';

// ==========================================
// 1. ZOD VALIDATION SCHEMAS
// ==========================================

export const cbtJadwalStep1Schema = z.object({
  bank_soal_id: z.string().min(1, 'Bank soal wajib dipilih'),
  nama_sesi: z.string().min(3, 'Nama sesi minimal 3 karakter'),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tanggal_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
  durasi_menit: z.number().int().min(10, 'Durasi minimal 10 menit'),
  toleransi_terlambat_menit: z.number().int().min(0),
});

export const cbtJadwalPayloadSchema = cbtJadwalStep1Schema.extend({
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran aktif tidak ditemukan'),
  semester_id: z.string().min(1, 'Semester aktif tidak ditemukan'),
  target_kelas_ids: z.array(z.string()).min(1, 'Pilih minimal satu kelas target ujian'),
});

// ==========================================
// 2. TIME & DURATION HELPERS
// ==========================================

/**
 * Menghitung estimasi waktu selesai ujian berdasarkan waktu mulai dan durasi (menit)
 */
export function computeEndFromStart(startLocal: string, minutes: number, timezone: string): string {
  try {
    const startIso = localDateTimeInputToISO(startLocal, timezone);
    const startMs = new Date(startIso).getTime();
    if (Number.isNaN(startMs)) return startLocal;
    const dur = Math.max(10, Number(minutes) || 90);
    return formatLocalDateTime(new Date(startMs + dur * 60 * 1000));
  } catch {
    return startLocal;
  }
}

/**
 * Memformat string preview jam selesai ujian beserta label timezone (WIB/WITA/WIT)
 */
export function getEndTimePreview(tanggalSelesai: string, tzLabel: string): string {
  if (!tanggalSelesai) return '';
  const timePart = tanggalSelesai.split('T')[1];
  return timePart ? `${timePart.slice(0, 5)} ${tzLabel}` : '';
}

// ==========================================
// 3. CLASS & TEACHER ASSIGNMENT HELPERS
// ==========================================

/**
 * Mengonversi tingkat bank soal format romawi ('X', 'XI', 'XII') ke angka (10, 11, 12)
 */
export function resolveBankTingkatNumber(selectedBankSoal?: CbtBankSoal | null): number | undefined {
  if (!selectedBankSoal) return undefined;
  if (selectedBankSoal.tingkat === 'X') return 10;
  if (selectedBankSoal.tingkat === 'XI') return 11;
  if (selectedBankSoal.tingkat === 'XII') return 12;
  return undefined;
}

/**
 * Mengekstrak ID kelas yang diampu guru berdasarkan penugasan mengajar dan mapel bank soal
 */
export function extractTeacherTaughtClassIds(
  assignments: any[],
  targetMapelId?: string
): string[] {
  const list = assignments || [];
  const relevant = targetMapelId
    ? list.filter((item: any) => item.mapel_id === targetMapelId || item.Mapel?.id === targetMapelId)
    : list;

  const pool = relevant.length > 0 ? relevant : list;
  const set = new Set<string>();
  pool.forEach((item: any) => {
    const kId = item.kelas_id || item.Kelas?.id;
    if (kId) set.add(kId);
  });
  return Array.from(set);
}

/**
 * Memfilter daftar kelas berdasarkan tingkat jenjang bank soal (X, XI, atau XII)
 */
export function filterClassesByTingkat(
  rawKelasList: any[],
  bankTingkatNumber?: number
): any[] {
  if (!bankTingkatNumber) return rawKelasList;
  return rawKelasList.filter((k) => Number(k.tingkat) === bankTingkatNumber);
}

/**
 * Memfilter kelas-kelas di jenjang terkait yang secara spesifik diampu oleh guru
 */
export function filterTeacherClasses(
  classesInTingkat: any[],
  teacherTaughtClassIds: string[]
): any[] {
  if (teacherTaughtClassIds.length === 0) return [];
  return classesInTingkat.filter((k) => teacherTaughtClassIds.includes(k.id));
}
