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

const coerceUpdateString = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (typeof val === 'number') return String(val).trim();
  if (typeof val === 'string') {
    const s = val.trim();
    return s === '' || s === '-' ? null : s;
  }
  return null;
}, z.string().nullable().optional());

const coerceUpdateDate = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  return parseSmartDate(val);
}, z.date().nullable().optional());

const coerceUpdateNumber = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}, z.number().nullable().optional());

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
  lintang: coerceString,
  bujur: coerceString,
  koordinat: coerceString,
  no_hp: coerceString,
  transportasi: coerceString,
  nama_ayah: coerceString,
  nik_ayah: coerceString,
  no_hp_ayah: coerceString,
  pekerjaan_ayah: coerceString,
  pendidikan_ayah: coerceString,
  penghasilan_ayah: coerceString,
  nama_ibu: coerceString,
  nik_ibu: coerceString,
  no_hp_ibu: coerceString,
  pekerjaan_ibu: coerceString,
  pendidikan_ibu: coerceString,
  penghasilan_ibu: coerceString,
  nama_wali: coerceString,
  nik_wali: coerceString,
  no_hp_wali: coerceString,
  hubungan_wali: coerceString,
  pekerjaan_wali: coerceString,
  penghasilan_wali: coerceString,
  no_hp_ortu: coerceString,
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
  agama: coerceString,
  hobi: coerceString,
  cita_cita: coerceString,
  is_osis: z.union([z.boolean(), z.string(), z.number()]).optional().default(false).transform(val => Boolean(val)),
  is_mpk: z.union([z.boolean(), z.string(), z.number()]).optional().default(false).transform(val => Boolean(val)),
  ekskul_1: coerceString,
  ekskul_2: coerceString,
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

export const updateSiswaSchema = z.object({
  nis: coerceUpdateString,
  nisn: coerceUpdateString,
  nik: coerceUpdateString,
  nama_siswa: z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (typeof val === 'string') {
      const s = val.trim();
      return s === '' ? undefined : s;
    }
    return undefined;
  }, z.string().min(1, 'Nama Siswa tidak boleh kosong').optional()),
  jenis_kelamin: z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (typeof val === 'string') {
      const s = val.trim().toUpperCase();
      if (s === 'P' || s.startsWith('PEREMPUAN') || s.startsWith('WITA') || s.startsWith('WANITA')) return 'P';
      return 'L';
    }
    return 'L';
  }, z.string().optional()),
  sekolah_asal: coerceUpdateString,
  no_ijazah_smp: coerceUpdateString,
  tempat_lahir: coerceUpdateString,
  tanggal_lahir: coerceUpdateDate,
  alamat: coerceUpdateString,
  dusun: coerceUpdateString,
  kelurahan: coerceUpdateString,
  kecamatan: coerceUpdateString,
  kabupaten: coerceUpdateString,
  provinsi: coerceUpdateString,
  rt: coerceUpdateString,
  rw: coerceUpdateString,
  kode_pos: coerceUpdateString,
  lintang: coerceUpdateString,
  bujur: coerceUpdateString,
  koordinat: coerceUpdateString,
  no_hp: coerceUpdateString,
  transportasi: coerceUpdateString,
  nama_ayah: coerceUpdateString,
  nik_ayah: coerceUpdateString,
  no_hp_ayah: coerceUpdateString,
  pekerjaan_ayah: coerceUpdateString,
  pendidikan_ayah: coerceUpdateString,
  penghasilan_ayah: coerceUpdateString,
  nama_ibu: coerceUpdateString,
  nik_ibu: coerceUpdateString,
  no_hp_ibu: coerceUpdateString,
  pekerjaan_ibu: coerceUpdateString,
  pendidikan_ibu: coerceUpdateString,
  penghasilan_ibu: coerceUpdateString,
  nama_wali: coerceUpdateString,
  nik_wali: coerceUpdateString,
  no_hp_wali: coerceUpdateString,
  hubungan_wali: coerceUpdateString,
  pekerjaan_wali: coerceUpdateString,
  penghasilan_wali: coerceUpdateString,
  no_hp_ortu: coerceUpdateString,
  anak_ke: coerceUpdateNumber,
  tinggi_badan: coerceUpdateNumber,
  berat_badan: coerceUpdateNumber,
  agama: coerceUpdateString,
  hobi: coerceUpdateString,
  cita_cita: coerceUpdateString,
  is_osis: z.union([z.boolean(), z.string(), z.number()]).optional().transform(val => val === undefined ? undefined : Boolean(val)),
  is_mpk: z.union([z.boolean(), z.string(), z.number()]).optional().transform(val => val === undefined ? undefined : Boolean(val)),
  ekskul_1: coerceUpdateString,
  ekskul_2: coerceUpdateString,
  kebutuhan_khusus: coerceUpdateString,
  penerima_kps: z.union([z.boolean(), z.string()]).optional().transform(val => {
    if (val === undefined) return undefined;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true' || val.trim().toLowerCase() === 'ya';
    return false;
  }),
  penerima_kip: z.union([z.boolean(), z.string()]).optional().transform(val => {
    if (val === undefined) return undefined;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true' || val.trim().toLowerCase() === 'ya';
    return false;
  }),
  no_kip: coerceUpdateString,
  tanggal_masuk: coerceUpdateDate,
  tanggal_keluar: coerceUpdateDate,
  alasan_keluar: coerceUpdateString,
  kelas_id: coerceUpdateString,
  jurusan_id: coerceUpdateString,
  tahun_pelajaran_id: coerceUpdateString,
  semester_id: coerceUpdateString,
  no_rfid: coerceUpdateString,
  email: z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val === 'string') {
      const s = val.trim();
      return s === '' || s === '-' ? null : s.toLowerCase();
    }
    return null;
  }, z.string().email('Format email tidak valid').optional().nullable()),
  status: coerceUpdateString,
  user_id: coerceUpdateString,
  foto: z.string().optional().nullable(),
  skipQuotaCheck: z.boolean().optional(),
  orang_tua: z.array(z.any()).optional(),
});

export type CreateSiswaSchema = z.infer<typeof createSiswaSchema>;
export type UpdateSiswaSchema = z.infer<typeof updateSiswaSchema>;
