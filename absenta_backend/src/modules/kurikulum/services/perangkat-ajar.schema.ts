import { z } from 'zod';

export const perangkatAjarUploadSchema = z.object({
  guru_id: z.string().uuid('ID Guru harus berupa UUID yang valid'),
  mapel_id: z.string().uuid('ID Mata Pelajaran harus berupa UUID yang valid'),
  tahun_pelajaran_id: z.string().uuid('ID Tahun Pelajaran harus berupa UUID yang valid'),
  semester_id: z.string().uuid('ID Semester harus berupa UUID yang valid'),
  judul: z.string().min(1, 'Judul perangkat ajar wajib diisi').max(255),
  jenis: z.enum(['RPP', 'MODUL_AJAR', 'SILABUS', 'PROTA', 'PROMES'], {
    errorMap: () => ({ message: 'Jenis perangkat ajar harus bernilai RPP, MODUL_AJAR, SILABUS, PROTA, atau PROMES' })
  }),
  file_url: z.string().min(1, 'URL berkas wajib disertakan'),
});

export const perangkatAjarReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status review harus bernilai APPROVED atau REJECTED' })
  }),
  catatan_reviewer: z.string().max(2000).optional().nullable(),
});
