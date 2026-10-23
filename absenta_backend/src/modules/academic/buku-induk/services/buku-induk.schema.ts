import { z } from 'zod';

// ── Query Params: Buku Induk List ──────────────────────────────────────────
export const getBukuIndukListSchema = z.object({
  tahun_pelajaran_id: z.string().uuid().optional(),
  kelas_id: z.string().uuid().optional(),
  jurusan_id: z.string().uuid().optional(),
  tingkat: z.string().regex(/^\d+$/).optional(),
  angkatan: z.string().regex(/^\d{4}$/).optional(), // tahun masuk, misal "2023"
  search: z.string().max(100).optional(),
  status: z.enum(['AKTIF', 'LULUS', 'MUTASI', 'KELUAR', 'CUTI']).optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 10000)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 200)
    .optional(),
});

export type GetBukuIndukListParams = z.output<typeof getBukuIndukListSchema>;

// ── Query Params: Buku Klapper List ───────────────────────────────────────
export const getKlapperListSchema = z.object({
  tahun_pelajaran_id: z.string().uuid().optional(),
  kelas_id: z.string().uuid().optional(),
  jurusan_id: z.string().uuid().optional(),
  tingkat: z.string().regex(/^\d+$/).optional(),
  angkatan: z.string().regex(/^\d{4}$/).optional(),
  status: z.enum(['AKTIF', 'LULUS', 'MUTASI', 'KELUAR', 'CUTI']).optional(),
  search: z.string().max(100).optional(),
  huruf: z
    .string()
    .length(1)
    .regex(/^[a-zA-Z]$/)
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 10000)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 200)
    .optional(),
});

export type GetKlapperListParams = z.output<typeof getKlapperListSchema>;

// ── Path Params: Buku Induk Detail ────────────────────────────────────────
export const getBukuIndukDetailSchema = z.object({
  siswaId: z.string().uuid(),
});

export type GetBukuIndukDetailParams = z.output<typeof getBukuIndukDetailSchema>;
