import { z } from 'zod';

// === Jenis Pelanggaran ===
export const createJenisPelanggaranSchema = z.object({
  kategori: z.string({
    required_error: 'Kategori wajib diisi'
  }).min(1, 'Kategori tidak boleh kosong'),
  nama_pelanggaran: z.string({
    required_error: 'Nama pelanggaran wajib diisi'
  }).min(1, 'Nama pelanggaran tidak boleh kosong'),
  poin: z.coerce.number({
    invalid_type_error: 'Poin harus berupa angka'
  }).min(0, 'Poin tidak boleh kurang dari 0')
});

export const updateJenisPelanggaranSchema = z.object({
  kategori: z.string().min(1, 'Kategori tidak boleh kosong').optional(),
  nama_pelanggaran: z.string().min(1, 'Nama pelanggaran tidak boleh kosong').optional(),
  poin: z.coerce.number().min(0, 'Poin tidak boleh kurang dari 0').optional()
});

// === Pelanggaran Siswa ===
export const createPelanggaranSchema = z.object({
  siswa_id: z.string({
    required_error: 'siswa_id wajib diisi'
  }).uuid({ message: 'siswa_id harus berupa UUID yang valid' }),
  tanggal: z.preprocess((val) => {
    if (!val) return undefined;
    return new Date(String(val));
  }, z.date({
    required_error: 'Tanggal wajib diisi'
  })),
  jenis_pelanggaran: z.string({
    required_error: 'Jenis pelanggaran wajib diisi'
  }).min(1, 'Jenis pelanggaran tidak boleh kosong'),
  poin: z.coerce.number({
    invalid_type_error: 'Poin harus berupa angka'
  }).min(0, 'Poin tidak boleh kurang dari 0'),
  keterangan: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  status: z.string().optional()
});

export const updatePelanggaranSchema = z.object({
  tanggal: z.preprocess((val) => {
    if (!val) return undefined;
    return new Date(String(val));
  }, z.date()).optional(),
  jenis_pelanggaran: z.string().min(1, 'Jenis pelanggaran tidak boleh kosong').optional(),
  poin: z.coerce.number().min(0, 'Poin tidak boleh kurang dari 0').optional(),
  keterangan: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  status: z.string().optional()
});

// === Jenis Prestasi ===
export const createJenisPrestasiSchema = z.object({
  kategori: z.string({
    required_error: 'Kategori wajib diisi'
  }).min(1, 'Kategori tidak boleh kosong'),
  nama_prestasi: z.string({
    required_error: 'Nama prestasi wajib diisi'
  }).min(1, 'Nama prestasi tidak boleh kosong'),
  poin: z.coerce.number({
    invalid_type_error: 'Poin harus berupa angka'
  }).min(0, 'Poin tidak boleh kurang dari 0')
});

export const updateJenisPrestasiSchema = z.object({
  kategori: z.string().min(1, 'Kategori tidak boleh kosong').optional(),
  nama_prestasi: z.string().min(1, 'Nama prestasi tidak boleh kosong').optional(),
  poin: z.coerce.number().min(0, 'Poin tidak boleh kurang dari 0').optional()
});

// === Prestasi Siswa ===
export const createPrestasiSiswaSchema = z.object({
  siswa_id: z.string({
    required_error: 'siswa_id wajib diisi'
  }).uuid({ message: 'siswa_id harus berupa UUID yang valid' }),
  tanggal: z.preprocess((val) => {
    if (!val) return undefined;
    return new Date(String(val));
  }, z.date({
    required_error: 'Tanggal wajib diisi'
  })),
  jenis_prestasi_id: z.string().uuid({ message: 'jenis_prestasi_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v),
  nama_prestasi: z.string({
    required_error: 'Nama prestasi wajib diisi'
  }).min(1, 'Nama prestasi tidak boleh kosong'),
  poin: z.coerce.number({
    invalid_type_error: 'Poin harus berupa angka'
  }).min(0, 'Poin tidak boleh kurang dari 0'),
  keterangan: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

export const updatePrestasiSiswaSchema = z.object({
  tanggal: z.preprocess((val) => {
    if (!val) return undefined;
    return new Date(String(val));
  }, z.date()).optional(),
  jenis_prestasi_id: z.string().uuid({ message: 'jenis_prestasi_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v),
  nama_prestasi: z.string().min(1, 'Nama prestasi tidak boleh kosong').optional(),
  poin: z.coerce.number().min(0, 'Poin tidak boleh kurang dari 0').optional(),
  keterangan: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

// === Izin Keluar Siswa (Piket) ===
export const createIzinSchema = z.object({
  siswa_akademik_id: z.string({
    required_error: 'siswa_akademik_id wajib diisi'
  }).uuid({ message: 'siswa_akademik_id harus berupa UUID yang valid' }),
  guru_piket_id: z.string().uuid({ message: 'guru_piket_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v),
  alasan: z.string({
    required_error: 'Alasan wajib diisi'
  }).min(1, 'Alasan tidak boleh kosong'),
  tipe_izin: z.string().default('IZIN_KELUAR'),
  status: z.string().optional(),
  jam_keluar: z.preprocess((val) => {
    if (!val) return undefined;
    return new Date(String(val));
  }, z.date({
    required_error: 'Jam keluar wajib diisi'
  }))
});
