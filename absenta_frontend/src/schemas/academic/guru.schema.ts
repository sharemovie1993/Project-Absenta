import { z } from 'zod';

export const guruSchema = z.object({
  nip: z.string().max(18, 'NIP maksimal 18 karakter').optional(),
  nuptk: z.string().optional(),
  nik: z.string().optional(),
  no_kk: z.string().optional(),
  npwp: z.string().optional(),
  nama_ibu_kandung: z.string().optional(),
  nama: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  no_hp: z.string().optional(),
  alamat: z.string().optional(),
  dusun: z.string().optional(),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  kabupaten: z.string().optional(),
  provinsi: z.string().optional(),
  rt: z.string().optional(),
  rw: z.string().optional(),
  kode_pos: z.string().optional(),
  tempat_lahir: z.string().optional(),
  tanggal_lahir: z.string().optional(),
  jenis_kelamin: z.enum(['L', 'P']),
  agama: z.string().optional(),
  status_kepegawaian: z.string().optional(),
  pendidikan_terakhir: z.string().optional(),
  pangkat_golongan: z.string().optional(),
  tmt_guru: z.string().optional(),
  rfid_tag: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  max_jp: z.number().int().min(0, 'JP minimal 0').optional().or(z.literal('')),
  jenis_ptk: z.string().optional(),
  foto: z.string().optional().nullable(),
  // For assignments
  mapel_ids: z.array(z.string()).optional(),
});

export type GuruFormValues = z.infer<typeof guruSchema>;
