import { z } from 'zod';

export const guruSchema = z.object({
  nip: z.string().max(18, 'NIP maksimal 18 karakter').optional(),
  nama: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  no_hp: z.string().optional(),
  alamat: z.string().optional(),
  tempat_lahir: z.string().optional(),
  tanggal_lahir: z.string().optional(),
  jenis_kelamin: z.enum(['L', 'P']),
  agama: z.string().optional(),
  status_kepegawaian: z.enum(['PNS', 'HONORER', 'KONTRAK']),
  pendidikan_terakhir: z.string().optional(),
  rfid_tag: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  max_jp: z.number().int().min(0, 'JP minimal 0').optional().or(z.literal('')),
  // For assignments
  mapel_ids: z.array(z.string()).optional(),
});

export type GuruFormValues = z.infer<typeof guruSchema>;
