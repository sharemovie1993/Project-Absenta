import { z } from 'zod';

export const saveNilaiEskulSchema = z.object({
  jenis_kegiatan_id: z.string().min(1, 'Ekstrakurikuler wajib dipilih'),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  semester_id: z.string().min(1, 'Semester wajib dipilih'),
  grades: z.array(
    z.object({
      siswa_id: z.string().min(1, 'ID siswa wajib diisi'),
      siswa_akademik_id: z.string().uuid().optional().nullable(),
      predikat: z.enum(['A', 'B', 'C', 'D'], {
        errorMap: () => ({ message: 'Predikat harus salah satu dari A, B, C, atau D' })
      }),
      keterangan: z.string().max(500, 'Keterangan maksimal 500 karakter').optional().nullable(),
    })
  ).min(1, 'Minimal satu data penilaian siswa'),
});

export type SaveNilaiEskulDto = z.infer<typeof saveNilaiEskulSchema>;
