import { z } from 'zod';

// ─── Pos Clearance Type ──────────────────────────────────────────────────────
export const POS_CLEARANCE_ENUM = z.enum([
  'PERPUSTAKAAN',
  'KEUANGAN',
  'BENGKEL_JURUSAN',
  'BK',
  'WALI_KELAS',
]);

export type PosClearanceType = z.infer<typeof POS_CLEARANCE_ENUM>;

// ─── Update Clearance DTO ────────────────────────────────────────────────────
export const updateClearanceSchema = z.object({
  siswa_id: z.string().uuid(),
  pos: POS_CLEARANCE_ENUM,
  status: z.enum(['BEBAS', 'BELUM_BEBAS']),
  catatan: z.string().max(255).optional(),
  petugas_nama: z.string().max(100).optional(),
});

export type UpdateClearanceDto = z.infer<typeof updateClearanceSchema>;

// ─── Preview Bebas Administrasi DTO ──────────────────────────────────────────
export const previewBebasAdministrasiSchema = z.object({
  siswa_id: z.string().uuid(),
  keperluan: z.string().max(200).optional().default('Persyaratan Pengambilan Ijazah & Sertifikat'),
  catatan_tambahan: z.string().max(500).optional(),
});

export type PreviewBebasAdministrasiDto = z.infer<typeof previewBebasAdministrasiSchema>;

// ─── Preview BAST Ijazah DTO ─────────────────────────────────────────────────
export const previewBastSchema = z.object({
  siswa_id: z.string().uuid(),
  nomor_seri_ijazah: z.string().max(100).optional().default('M-SMK/K13/2026/0000000'),
  tanggal_serah_terima: z.string().optional(),
  penerima: z
    .object({
      status: z.enum(['SISWA_SENDIRI', 'ORANG_TUA', 'WALI_KUASA']).default('SISWA_SENDIRI'),
      nama: z.string().max(150).optional(),
      nik: z.string().max(30).optional(),
      hubungan: z.string().max(100).optional().default('Siswa Yang Bersangkutan'),
      no_hp: z.string().max(30).optional(),
    })
    .optional(),
  dokumen_diserahkan: z.array(z.string()).optional(),
});

export type PreviewBastDto = z.infer<typeof previewBastSchema>;

// ─── Issue BAST Ijazah DTO ───────────────────────────────────────────────────
export const issueBastSchema = z.object({
  siswa_id: z.string().uuid(),
  nomor_bast: z.string().min(3).max(100),
  nomor_seri_ijazah: z.string().min(3).max(100),
  tanggal_serah_terima: z.string().min(8),
  penerima: z.object({
    status: z.enum(['SISWA_SENDIRI', 'ORANG_TUA', 'WALI_KUASA']),
    nama: z.string().min(2).max(150),
    nik: z.string().max(30).optional(),
    hubungan: z.string().max(100),
    no_hp: z.string().max(30).optional(),
  }),
  dokumen_diserahkan: z.array(z.string()).min(1),
  catatan: z.string().max(500).optional(),
});

export type IssueBastDto = z.infer<typeof issueBastSchema>;

// ─── Query Buku Ekspedisi DTO ────────────────────────────────────────────────
export const getBukuEkspedisiSchema = z.object({
  tahun_pelajaran_id: z.string().uuid().optional(),
  status_ambil: z.enum(['ALL', 'DIAMBIL', 'BELUM']).optional().default('ALL'),
  search: z.string().max(100).optional(),
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

export type GetBukuEkspedisiDto = z.output<typeof getBukuEkspedisiSchema>;
