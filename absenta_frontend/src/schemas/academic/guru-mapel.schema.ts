import { z } from 'zod';

export const guruMapelSchema = z.object({
  guru_id: z.string().min(1, 'Guru wajib dipilih'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih')
});

export type GuruMapelFormValues = z.infer<typeof guruMapelSchema>;
