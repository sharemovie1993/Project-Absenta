import { z } from 'zod';

export const createMitraSchema = z.object({
  nama: z.string().min(1, 'Nama mitra industri wajib diisi'),
  logo_url: z.string().optional().nullable(),
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

export const bulkDeleteMitraSchema = z.object({
  ids: z.array(z.string().min(1, 'ID mitra tidak boleh kosong'))
    .min(1, 'Daftar ID mitra tidak boleh kosong')
    .max(100, 'Maksimal 100 mitra industri dapat dihapus dalam satu kali transaksi'),
});

export const createPenempatanSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa wajib dipilih'),
  mitra_id: z.string().min(1, 'Mitra industri wajib dipilih'),
  tanggal_mulai: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  tanggal_selesai: z.union([z.date(), z.string()]).transform((v) => (v ? new Date(v) : null)).optional().nullable(),
  status: z.string().optional().default('AKTIF'),
  pembimbing_id: z.string().optional().nullable().transform((v) => (v && typeof v === 'string' && v.trim() !== '' ? v.trim() : null)),
  tahun_pelajaran_id: z.string().optional().nullable(),
  semester_id: z.string().optional().nullable(),
  lat_override: z.number().optional().nullable(),
  lon_override: z.number().optional().nullable(),
  radius_override: z.number().int().optional().nullable(),
  is_flexible_location: z.boolean().optional().default(false),
});

export const updatePenempatanSchema = createPenempatanSchema.partial();

export const bulkCreatePenempatanSchema = z.union([
  z.object({
    siswa_ids: z.array(z.string()).min(1, 'Daftar siswa wajib diisi'),
    mitra_id: z.string().min(1, 'Mitra industri wajib dipilih'),
    tanggal_mulai: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
    tanggal_selesai: z.union([z.date(), z.string()]).transform((v) => (v ? new Date(v) : null)).optional().nullable(),
    status: z.string().optional().default('AKTIF'),
    pembimbing_id: z.string().optional().nullable().transform((v) => (v && typeof v === 'string' && v.trim() !== '' ? v.trim() : null)),
    tahun_pelajaran_id: z.string().optional().nullable(),
    semester_id: z.string().optional().nullable(),
  }),
  z.array(
    z.object({
      siswa_id: z.string().min(1, 'Siswa wajib dipilih'),
      mitra_id: z.string().min(1, 'Mitra industri wajib dipilih'),
      tanggal_mulai: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
      tanggal_selesai: z.union([z.date(), z.string()]).transform((v) => (v ? new Date(v) : null)).optional().nullable(),
      status: z.string().optional().default('AKTIF'),
      pembimbing_id: z.string().optional().nullable().transform((v) => (v && typeof v === 'string' && v.trim() !== '' ? v.trim() : null)),
      tahun_pelajaran_id: z.string().optional().nullable(),
      semester_id: z.string().optional().nullable(),
    })
  ).min(1, 'Daftar penempatan tidak boleh kosong')
]);

export const bulkDeletePenempatanSchema = z.object({
  ids: z.array(z.string().min(1, 'ID penempatan tidak valid')).min(1, 'Daftar ID penempatan wajib diisi')
});

export const importExcelPlottingSchema = z.object({
  items: z.array(
    z.object({
      siswa_id: z.string().min(1, 'ID Siswa wajib valid'),
      nisn: z.string().optional().nullable(),
      nama_siswa_excel: z.string().optional().nullable(),
      mitra_id: z.string().optional().nullable(),
      mitra_nama: z.string().min(1, 'Nama DU/DI / Tempat PKL wajib diisi'),
      mitra_alamat: z.string().optional().nullable(),
      create_mitra_if_missing: z.boolean().optional().default(true),
      pembimbing_id: z.string().optional().nullable().transform((v) => (v && typeof v === 'string' && v.trim() !== '' ? v.trim() : null)),
      tanggal_mulai: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
      tanggal_selesai: z.union([z.date(), z.string()]).transform((v) => (v ? new Date(v) : null)).optional().nullable(),
      status: z.string().optional().default('AKTIF'),
      instruktur_nama: z.string().optional().nullable(),
      penanggung_jawab_nama: z.string().optional().nullable(),
      no_telp_mitra: z.string().optional().nullable(),
    })
  ).min(1, 'Daftar entri import tidak boleh kosong'),
  tahun_pelajaran_id: z.string().optional().nullable(),
  semester_id: z.string().optional().nullable(),
});

