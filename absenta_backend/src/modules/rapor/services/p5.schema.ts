import { z } from 'zod';

export const p5ProjekCreateSchema = z.object({
  judul: z.string().min(1, 'Judul projek P5 wajib diisi').max(255),
  deskripsi: z.string().max(2000).optional().nullable(),
  tahun_pelajaran_id: z.string().uuid('ID Tahun Pelajaran wajib diisi'),
  semester_id: z.string().uuid('ID Semester wajib diisi'),
});

export const p5ProjekUpdateSchema = p5ProjekCreateSchema.partial();

export const p5NilaiSiswaUpsertSchema = z.object({
  projek_id: z.string().uuid('ID Projek P5 wajib diisi'),
  siswa_id: z.string().uuid('ID Siswa wajib diisi'),
  dimensi: z.string().min(1, 'Dimensi P5 (misal: Gotong Royong) wajib diisi').max(255),
  sub_elemen: z.string().min(1, 'Sub-elemen P5 wajib diisi').max(255),
  kualifikasi: z.enum(['BB', 'MB', 'BSH', 'SB'], {
    errorMap: () => ({ message: 'Kualifikasi harus bernilai BB, MB, BSH, atau SB' })
  }),
  catatan_proses: z.string().max(2000).optional().nullable(),
});

export const bulkP5NilaiSiswaSchema = z.object({
  projek_id: z.string().uuid('ID Projek P5 wajib diisi'),
  dimensi: z.string().min(1, 'Dimensi P5 wajib diisi'),
  sub_elemen: z.string().min(1, 'Sub-elemen P5 wajib diisi'),
  scores: z.array(
    z.object({
      siswa_id: z.string().uuid('ID Siswa wajib diisi'),
      kualifikasi: z.enum(['BB', 'MB', 'BSH', 'SB']),
      catatan_proses: z.string().max(2000).optional().nullable(),
    })
  ).min(1, 'Daftar nilai projek tidak boleh kosong'),
});
