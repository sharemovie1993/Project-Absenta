import { z } from 'zod';

export const strukturKurikulumUpsertSchema = z.object({
  mapel_id: z.string({
    required_error: 'mapel_id wajib diisi'
  }).uuid({
    message: 'mapel_id harus berupa UUID yang valid'
  }),
  tahun_pelajaran_id: z.string({
    required_error: 'tahun_pelajaran_id wajib diisi'
  }).uuid({
    message: 'tahun_pelajaran_id harus berupa UUID yang valid'
  }),
  tingkat: z.number({
    required_error: 'tingkat wajib diisi'
  }).int().min(1, 'Tingkat minimal 1').max(13, 'Tingkat maksimal 13'),
  jurusan_id: z.string().uuid({
    message: 'jurusan_id harus berupa UUID yang valid'
  }).nullable().optional().transform(v => v === null ? undefined : v),
  jp_per_minggu: z.number({
    required_error: 'jp_per_minggu wajib diisi'
  }).int().min(1, 'Jumlah jam pelajaran minimal 1'),
  kelompok: z.string().max(100, 'Nama kelompok maksimal 100 karakter').nullable().optional().transform(v => v === null ? undefined : v)
});

export const supervisiGuruCreateSchema = z.object({
  guru_id: z.string({
    required_error: 'guru_id wajib diisi'
  }).uuid({
    message: 'guru_id harus berupa UUID yang valid'
  }),
  tanggal: z.preprocess((val) => {
    if (typeof val === 'string' || val instanceof Date) return new Date(val);
    return val;
  }, z.date({
    required_error: 'tanggal wajib diisi',
    invalid_type_error: 'Format tanggal tidak valid'
  })),
  mapel: z.string().max(100, 'Nama mapel maksimal 100 karakter').nullable().optional().transform(v => v === null ? undefined : v),
  kelas: z.string().max(50, 'Nama kelas maksimal 50 karakter').nullable().optional().transform(v => v === null ? undefined : v),
  jam_ke: z.number().int().min(1, 'Jam ke minimal 1').nullable().optional().transform(v => v === null ? undefined : v),
  status: z.enum(['SCHEDULED', 'COMPLETED']).default('SCHEDULED').optional(),
  catatan: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  supervisor_id: z.string().uuid({
    message: 'supervisor_id harus berupa UUID yang valid'
  }).nullable().optional().transform(v => v === null ? undefined : v)
});

export const supervisiGuruUpdateSchema = z.object({
  tanggal: z.preprocess((val) => {
    if (val === undefined || val === null) return val;
    if (typeof val === 'string' || val instanceof Date) return new Date(val);
    return val;
  }, z.date({
    invalid_type_error: 'Format tanggal tidak valid'
  })).optional(),
  mapel: z.string().max(100, 'Nama mapel maksimal 100 karakter').nullable().optional().transform(v => v === null ? undefined : v).optional(),
  kelas: z.string().max(50, 'Nama kelas maksimal 50 karakter').nullable().optional().transform(v => v === null ? undefined : v).optional(),
  jam_ke: z.number().int().min(1, 'Jam ke minimal 1').nullable().optional().transform(v => v === null ? undefined : v).optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED']).optional(),
  catatan: z.string().nullable().optional().transform(v => v === null ? undefined : v).optional(),
  nilai: z.number().int().min(0, 'Nilai minimal 0').max(100, 'Nilai maksimal 100').nullable().optional().transform(v => v === null ? undefined : v),
  supervisor_id: z.string().uuid({
    message: 'supervisor_id harus berupa UUID yang valid'
  }).nullable().optional().transform(v => v === null ? undefined : v).optional()
});
