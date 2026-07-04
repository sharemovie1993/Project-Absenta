import { z } from 'zod';

export const createGuruSchema = z.object({
  user_id: z.string().optional().nullable(),
  nip: z.string().optional().nullable(),
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
});

export const updateGuruSchema = createGuruSchema.extend({
  status: z.string().optional().nullable(),
}).partial();

export type CreateGuruSchema = z.infer<typeof createGuruSchema>;
export type UpdateGuruSchema = z.infer<typeof updateGuruSchema>;
