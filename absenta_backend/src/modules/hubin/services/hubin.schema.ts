import { z } from 'zod';

export const createMitraSchema = z.object({
  nama: z.string().min(1, 'Nama mitra industri wajib diisi'),
  bidang: z.string().optional().nullable(),
  alamat: z.string().optional().nullable(),
  kontak: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  radius: z.number().int().optional().default(100),
  pic_nama: z.string().optional().nullable(),
  pic_jabatan: z.string().optional().nullable(),
  pic_telepon: z.string().optional().nullable(),
  pic_email: z.string().email('Format email PIC tidak valid').optional().nullable().or(z.literal('')),
  mou_nomor: z.string().optional().nullable(),
  mou_url: z.string().optional().nullable(),
  mou_tanggal_mulai: z.union([z.date(), z.string()]).transform((v) => (v ? new Date(v) : null)).optional().nullable(),
  mou_tanggal_berakhir: z.union([z.date(), z.string()]).transform((v) => (v ? new Date(v) : null)).optional().nullable(),
  mou_status: z.string().optional().default('AKTIF'),
  kuota_pkl: z.number().int().optional().default(0),
  kompetensi_keahlian: z.string().optional().nullable(),
});

export const updateMitraSchema = createMitraSchema.partial();

export const createPenempatanSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa wajib dipilih'),
  mitra_id: z.string().min(1, 'Mitra industri wajib dipilih'),
  tanggal_mulai: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  tanggal_selesai: z.union([z.date(), z.string()]).transform((v) => (v ? new Date(v) : null)).optional().nullable(),
  status: z.string().optional().default('AKTIF'),
  pembimbing_id: z.string().optional().nullable(),
  lat_override: z.number().optional().nullable(),
  lon_override: z.number().optional().nullable(),
  radius_override: z.number().int().optional().nullable(),
  is_flexible_location: z.boolean().optional().default(false),
});

export const updatePenempatanSchema = createPenempatanSchema.partial();

export const bulkCreatePenempatanSchema = z.object({
  siswa_ids: z.array(z.string()).min(1, 'Daftar siswa wajib diisi'),
  mitra_id: z.string().min(1, 'Mitra industri wajib dipilih'),
  tanggal_mulai: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  tanggal_selesai: z.union([z.date(), z.string()]).transform((v) => (v ? new Date(v) : null)).optional().nullable(),
  status: z.string().optional().default('AKTIF'),
  pembimbing_id: z.string().optional().nullable(),
});
