import { z } from 'zod';

// Base validation schemas
const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
const nikRegex = /^[0-9]{16}$/;
const nipRegex = /^[0-9]{18}$/;

// Guru Validation Schema
export const guruSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant ID wajib diisi'),
  user_id: z.string().min(1, 'User ID wajib diisi'),
  nip: z.string()
    .optional()
    .refine((val) => !val || nipRegex.test(val), {
      message: 'NIP harus 18 digit angka'
    }),
  nama_guru: z.string()
    .min(2, 'Nama guru minimal 2 karakter')
    .max(100, 'Nama guru maksimal 100 karakter'),
  no_rfid: z.string().optional()
});

export const createGuruSchema = guruSchema;
export const updateGuruSchema = guruSchema.partial();

// Siswa Validation Schema
export const siswaSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant ID wajib diisi'),
  user_id: z.string().optional(),
  nis: z.string()
    .min(1, 'NIS wajib diisi')
    .max(20, 'NIS maksimal 20 karakter'),
  nisn: z.string()
    .optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val), {
      message: 'NISN harus 10 digit angka'
    }),
  nik: z.string()
    .optional()
    .refine((val) => !val || nikRegex.test(val), {
      message: 'NIK harus 16 digit angka'
    }),
  nama_siswa: z.string()
    .min(2, 'Nama siswa minimal 2 karakter')
    .max(100, 'Nama siswa maksimal 100 karakter'),
  jenis_kelamin: z.enum(['L', 'P'], {
    message: 'Jenis kelamin harus L (Laki-laki) atau P (Perempuan)'
  }),
  tempat_lahir: z.string()
    .max(50, 'Tempat lahir maksimal 50 karakter')
    .optional(),
  tanggal_lahir: z.date().optional(),
  alamat: z.string()
    .max(200, 'Alamat maksimal 200 karakter')
    .optional(),
  dusun: z.string().max(50, 'Dusun maksimal 50 karakter').optional(),
  kelurahan: z.string().max(50, 'Kelurahan maksimal 50 karakter').optional(),
  kecamatan: z.string().max(50, 'Kecamatan maksimal 50 karakter').optional(),
  kabupaten: z.string().max(50, 'Kabupaten maksimal 50 karakter').optional(),
  provinsi: z.string().max(50, 'Provinsi maksimal 50 karakter').optional(),
  rt: z.string().max(3, 'RT maksimal 3 karakter').optional(),
  rw: z.string().max(3, 'RW maksimal 3 karakter').optional(),
  kode_pos: z.string()
    .optional()
    .refine((val) => !val || /^[0-9]{5}$/.test(val), {
      message: 'Kode pos harus 5 digit angka'
    }),
  no_hp: z.string()
    .optional()
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Format nomor HP tidak valid'
    }),
  transportasi: z.string().max(50, 'Transportasi maksimal 50 karakter').optional(),
  nama_ayah: z.string().max(100, 'Nama ayah maksimal 100 karakter').optional(),
  nik_ayah: z.string()
    .optional()
    .refine((val) => !val || nikRegex.test(val), {
      message: 'NIK ayah harus 16 digit angka'
    }),
  pekerjaan_ayah: z.string().max(50, 'Pekerjaan ayah maksimal 50 karakter').optional(),
  pendidikan_ayah: z.string().max(50, 'Pendidikan ayah maksimal 50 karakter').optional(),
  penghasilan_ayah: z.string().max(50, 'Penghasilan ayah maksimal 50 karakter').optional(),
  nama_ibu: z.string().max(100, 'Nama ibu maksimal 100 karakter').optional(),
  nik_ibu: z.string()
    .optional()
    .refine((val) => !val || nikRegex.test(val), {
      message: 'NIK ibu harus 16 digit angka'
    }),
  pekerjaan_ibu: z.string().max(50, 'Pekerjaan ibu maksimal 50 karakter').optional(),
  pendidikan_ibu: z.string().max(50, 'Pendidikan ibu maksimal 50 karakter').optional(),
  penghasilan_ibu: z.string().max(50, 'Penghasilan ibu maksimal 50 karakter').optional(),
  nama_wali: z.string().max(100, 'Nama wali maksimal 100 karakter').optional(),
  hubungan_wali: z.string().max(50, 'Hubungan wali maksimal 50 karakter').optional(),
  pekerjaan_wali: z.string().max(50, 'Pekerjaan wali maksimal 50 karakter').optional(),
  penghasilan_wali: z.string().max(50, 'Penghasilan wali maksimal 50 karakter').optional(),
  anak_ke: z.number().int().min(1, 'Anak ke minimal 1').optional(),
  kebutuhan_khusus: z.string().max(100, 'Kebutuhan khusus maksimal 100 karakter').optional(),
  penerima_kps: z.boolean().optional(),
  penerima_kip: z.boolean().optional(),
  no_kip: z.string().max(20, 'No KIP maksimal 20 karakter').optional(),
  kelas_id: z.string().min(1, 'Kelas wajib dipilih'),
  tahun_pelajaran_id: z.string().optional(),
  semester_id: z.string().optional(),
  tanggal_masuk: z.date().optional(),
  tanggal_keluar: z.date().optional(),
  alasan_keluar: z.string().max(200, 'Alasan keluar maksimal 200 karakter').optional(),
  status: z.enum(['AKTIF', 'TIDAK_AKTIF', 'LULUS', 'PINDAH', 'KELUAR'], {
    message: 'Status tidak valid'
  }),
  no_rfid: z.string().optional()
});

export const createSiswaSchema = siswaSchema;
export const updateSiswaSchema = siswaSchema.partial();

// Kelas Validation Schema
export const kelasSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant ID wajib diisi'),
  nama_kelas: z.string()
    .min(1, 'Nama kelas wajib diisi')
    .max(50, 'Nama kelas maksimal 50 karakter'),
  tingkat: z.number()
    .int()
    .min(1, 'Tingkat minimal 1')
    .max(12, 'Tingkat maksimal 12'),
  jurusan_id: z.string().optional(),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  kapasitas: z.number()
    .int()
    .min(1, 'Kapasitas minimal 1')
    .max(50, 'Kapasitas maksimal 50')
    .optional()
});

export const createKelasSchema = kelasSchema;
export const updateKelasSchema = kelasSchema.partial();

// Mapel Validation Schema
export const mapelSchema = z.object({
  nama_mapel: z.string()
    .min(2, 'Nama mata pelajaran minimal 2 karakter')
    .max(100, 'Nama mata pelajaran maksimal 100 karakter'),
  kode_mapel: z.string()
    .max(10, 'Kode mata pelajaran maksimal 10 karakter')
    .optional(),
  tingkat: z.number()
    .int()
    .min(1, 'Tingkat minimal 1')
    .max(12, 'Tingkat maksimal 12')
    .optional()
});

export const createMapelSchema = mapelSchema;
export const updateMapelSchema = mapelSchema.partial();

// Tahun Pelajaran Validation Schema
export const tahunPelajaranBaseSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant ID wajib diisi'),
  nama_tahun: z.string()
    .min(1, 'Nama tahun pelajaran wajib diisi')
    .max(20, 'Nama tahun pelajaran maksimal 20 karakter'),
  tahun_mulai: z.number()
    .int()
    .min(2000, 'Tahun mulai minimal 2000')
    .max(2100, 'Tahun mulai maksimal 2100'),
  tahun_selesai: z.number()
    .int()
    .min(2000, 'Tahun selesai minimal 2000')
    .max(2100, 'Tahun selesai maksimal 2100'),
  tanggal_mulai: z.date(),
  tanggal_selesai: z.date(),
  is_active: z.boolean()
});

export const tahunPelajaranSchema = tahunPelajaranBaseSchema
  .refine((data) => data.tahun_selesai > data.tahun_mulai, {
    message: 'Tahun selesai harus lebih besar dari tahun mulai',
    path: ['tahun_selesai']
  })
  .refine((data) => data.tanggal_selesai > data.tanggal_mulai, {
    message: 'Tanggal selesai harus lebih besar dari tanggal mulai',
    path: ['tanggal_selesai']
  });

export const createTahunPelajaranSchema = tahunPelajaranSchema;
export const updateTahunPelajaranSchema = tahunPelajaranBaseSchema.partial();

// Semester Validation Schema
export const semesterBaseSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant ID wajib diisi'),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  nama_semester: z.string()
    .min(1, 'Nama semester wajib diisi')
    .max(50, 'Nama semester maksimal 50 karakter'),
  semester: z.number()
    .int()
    .min(1, 'Semester minimal 1')
    .max(2, 'Semester maksimal 2'),
  tanggal_mulai: z.date(),
  tanggal_selesai: z.date(),
  is_active: z.boolean()
});

export const semesterSchema = semesterBaseSchema.refine((data) => data.tanggal_selesai > data.tanggal_mulai, {
  message: 'Tanggal selesai harus lebih besar dari tanggal mulai',
  path: ['tanggal_selesai']
});

export const createSemesterSchema = semesterSchema;
export const updateSemesterSchema = semesterBaseSchema.partial();

// Export all schemas for easy import
export const academicSchemas = {
  guru: {
    create: createGuruSchema,
    update: updateGuruSchema
  },
  siswa: {
    create: createSiswaSchema,
    update: updateSiswaSchema
  },
  kelas: {
    create: createKelasSchema,
    update: updateKelasSchema
  },
  mapel: {
    create: createMapelSchema,
    update: updateMapelSchema
  },
  tahunPelajaran: {
    create: createTahunPelajaranSchema,
    update: updateTahunPelajaranSchema
  },
  semester: {
    create: createSemesterSchema,
    update: updateSemesterSchema
  }
};

// Type exports for TypeScript
export type GuruFormData = z.infer<typeof guruSchema>;
export type SiswaFormData = z.infer<typeof siswaSchema>;
export type KelasFormData = z.infer<typeof kelasSchema>;
export type MapelFormData = z.infer<typeof mapelSchema>;
export type TahunPelajaranFormData = z.infer<typeof tahunPelajaranSchema>;
export type SemesterFormData = z.infer<typeof semesterSchema>;