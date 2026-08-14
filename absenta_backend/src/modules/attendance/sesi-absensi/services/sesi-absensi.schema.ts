import { z } from 'zod';
import { AbsenStatus } from '@/constants/enums';

function parseSafeDate(input: any): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  const str = String(input).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split(' ');
    const dateParts = parts[0].split('/');
    const day = dateParts[0].padStart(2, '0');
    const month = dateParts[1].padStart(2, '0');
    const year = dateParts[2];
    const timePart = parts[1] || '00:00:00';
    const isoStr = `${year}-${month}-${day}T${timePart}`;
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

export const createSesiAbsensiSchema = z.object({
  jadwal_kbm_id: z.string().optional().nullable(),
  kelas_id: z.string().min(1, 'kelas_id wajib diisi'),
  guru_id: z.string().optional().nullable().or(z.literal('')),
  mapel_id: z.string().optional().nullable(),
  waktu_mulai: z.union([z.date(), z.string()]).transform((v) => parseSafeDate(v)).optional().nullable(),
  waktu_selesai: z.union([z.date(), z.string()]).transform((v) => (v ? parseSafeDate(v) : null)).optional().nullable(),
  jenis_kegiatan_id: z.string().optional().nullable(),
  jenis_kegiatan: z.string().optional().nullable(),
  tanggal: z.string().optional().nullable(),
  keterangan: z.string().optional().nullable(),
  foto_kegiatan: z.string().optional().nullable(),
  foto_bukti_url: z.string().optional().nullable(),
  tipe_kegiatan: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updateSesiAbsensiSchema = createSesiAbsensiSchema.partial();

export const updateSesiStatusSchema = z.object({
  status: z.enum(['BELUM_MULAI', 'BERLANGSUNG', 'SELESAI', 'BATAL']),
});

export const updateAbsenGuruSchema = z.object({
  status: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
  foto: z.string().optional().nullable(),
  foto_kegiatan: z.string().optional().nullable(),
  waktu_tap: z.string().optional().nullable(),
});

export const tapSiswaSchema = z.object({
  siswa_id: z.string().optional().nullable(),
  siswa_akademik_id: z.string().optional().nullable(),
  status: z.nativeEnum(AbsenStatus).optional().nullable(),
  rfid: z.string().optional().nullable(),
  device_id: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
});
