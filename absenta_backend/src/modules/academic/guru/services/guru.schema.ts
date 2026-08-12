import { z } from 'zod';

export const createGuruSchema = z.object({
  user_id: z.string().optional().nullable(),
  nip: z.string().optional().nullable(),
  nuptk: z.string().optional().nullable(),
  nik: z.string().optional().nullable(),
  npwp: z.string().optional().nullable(),
  nama_ibu_kandung: z.string().optional().nullable(),
  nama_guru: z.string().min(1, 'Nama guru wajib diisi'),
  no_rfid: z.string().optional().nullable(),
  email: z.string().email('Format email tidak valid').optional().nullable(),
  no_hp: z.string().optional().nullable(),
  alamat: z.string().optional().nullable(),
  tempat_lahir: z.string().optional().nullable(),
  tanggal_lahir: z.union([z.date(), z.string()])
    .transform((v) => (v ? new Date(v) : null))
    .optional()
    .nullable(),
  jenis_kelamin: z.string().optional().nullable(),
  agama: z.string().optional().nullable(),
  status_kepegawaian: z.string().optional().nullable(),
  pendidikan_terakhir: z.string().optional().nullable(),
  pangkat_golongan: z.string().optional().nullable(),
  tmt_guru: z.string().optional().nullable(),
  jenis_ptk: z.string().optional().nullable(),
  foto: z.string().optional().nullable(),
  max_jp: z.number().int().min(1, 'Batas JP minimal 1').max(100, 'Batas JP maksimal 100').optional().nullable(),
});

export const updateGuruSchema = createGuruSchema.extend({
  status: z.string().optional().nullable(),
}).partial();

export type CreateGuruSchema = z.infer<typeof createGuruSchema>;
export type UpdateGuruSchema = z.infer<typeof updateGuruSchema>;
