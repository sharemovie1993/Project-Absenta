import { z } from 'zod';
import { parseSmartDate } from '@/utils/normalization';

const coerceDate = z.preprocess((val) => {
  if (val === null || val === undefined || val === '') return undefined;
  return parseSmartDate(val);
}, z.date().optional().nullable());

const coerceString = z.preprocess((val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number') return String(val).trim();
  if (typeof val === 'string') {
    const s = val.trim();
    return s === '' || s === '-' ? undefined : s;
  }
  return undefined;
}, z.string().optional().nullable());

const coerceRequiredString = (fieldName: string) => z.preprocess((val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number') return String(val).trim();
  if (typeof val === 'string') {
    const s = val.trim();
    return s === '' || s === '-' ? undefined : s;
  }
  return undefined;
}, z.string({ required_error: `${fieldName} wajib diisi` }).min(1, `${fieldName} wajib diisi`));

export const createSiswaSchema = z.object({
  nis: coerceString, // Make NIS optional to support auto-generation
  nisn: coerceString,
  nik: coerceString,
  nama_siswa: coerceRequiredString('Nama Siswa'),
  jenis_kelamin: z.preprocess((val) => {
    if (val === null || val === undefined) return 'L';
    if (typeof val === 'string') {
      const s = val.trim().toUpperCase();
      if (s === 'P' || s.startsWith('PEREMPUAN') || s.startsWith('WITA') || s.startsWith('WANITA')) return 'P';
      return 'L';
    }
    return 'L';
  }, z.string().default('L')),
  sekolah_asal: coerceString,
  no_ijazah_smp: coerceString,
  tempat_lahir: coerceString,
  tanggal_lahir: coerceDate,
  alamat: coerceString,
  dusun: coerceString,
  kelurahan: coerceString,
  kecamatan: coerceString,
  kabupaten: coerceString,
  provinsi: coerceString,
  rt: coerceString,
  rw: coerceString,
  kode_pos: coerceString,
  no_hp: coerceString,
  transportasi: coerceString,
  nama_ayah: coerceString,
  nik_ayah: coerceString,
  pekerjaan_ayah: coerceString,
  pendidikan_ayah: coerceString,
  penghasilan_ayah: coerceString,
  nama_ibu: coerceString,
  nik_ibu: coerceString,
  pekerjaan_ibu: coerceString,
  pendidikan_ibu: coerceString,
  penghasilan_ibu: coerceString,
  nama_wali: coerceString,
  hubungan_wali: coerceString,
  pekerjaan_wali: coerceString,
  penghasilan_wali: coerceString,
  anak_ke: z.union([z.number(), z.string()]).optional().nullable().transform(val => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }),
  tinggi_badan: z.union([z.number(), z.string()]).optional().nullable().transform(val => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }),
  berat_badan: z.union([z.number(), z.string()]).optional().nullable().transform(val => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }),
  kebutuhan_khusus: coerceString,
  penerima_kps: z.union([z.boolean(), z.string()]).optional().default(false).transform(val => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true' || val.trim().toLowerCase() === 'ya';
    return false;
  }),
  penerima_kip: z.union([z.boolean(), z.string()]).optional().default(false).transform(val => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true' || val.trim().toLowerCase() === 'ya';
    return false;
  }),
  no_kip: coerceString,
  tanggal_masuk: coerceDate,
  tanggal_keluar: coerceDate,
  alasan_keluar: coerceString,
  kelas_id: coerceString,
  jurusan_id: coerceString,
  tahun_pelajaran_id: coerceString,
  semester_id: coerceString,
  no_rfid: coerceString,
  email: z.preprocess((val) => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'string') {
      const s = val.trim();
      return s === '' || s === '-' ? undefined : s;
    }
    return undefined;
  }, z.string().email('Format email tidak valid').optional().nullable()),
  status: coerceString.default('AKTIF'),
  user_id: coerceString,
  foto: z.string().optional().nullable(),
  skipQuotaCheck: z.boolean().optional().default(false),
  orang_tua: z.array(z.any()).optional(),
});

export const updateSiswaSchema = createSiswaSchema.partial();

export type CreateSiswaSchema = z.infer<typeof createSiswaSchema>;
export type UpdateSiswaSchema = z.infer<typeof updateSiswaSchema>;
