import { z } from 'zod';

export const siswaSchema = z.object({
  nis: z.string().max(20, 'NIS maksimal 20 karakter').optional().or(z.literal('')),
  nama_siswa: z.string().min(1, 'Nama siswa wajib diisi'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  no_hp: z.string().optional().or(z.literal('')),
  alamat: z.string().optional().or(z.literal('')),
  tanggal_lahir: z.string().optional().or(z.literal('')),
  tempat_lahir: z.string().optional().or(z.literal('')),
  jenis_kelamin: z.enum(['L', 'P']).optional().or(z.literal('')),
  nisn: z.string().max(20, 'NISN maksimal 20 karakter').optional().or(z.literal('')),
  nik: z.string().max(30, 'NIK maksimal 30 karakter').optional().or(z.literal('')),
  tinggi_badan: z.union([z.number(), z.string()]).optional().nullable(),
  berat_badan: z.union([z.number(), z.string()]).optional().nullable(),
  kelas_id: z.string().min(1, 'Kelas wajib dipilih'),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  semester_id: z.string().min(1, 'Semester wajib dipilih'),
  status: z.enum(['AKTIF', 'TIDAK_AKTIF', 'LULUS', 'PINDAH', 'KELUAR']),
  tanggal_keluar: z.string().optional().or(z.literal('')),
  alasan_keluar: z.string().optional().or(z.literal('')),
  transportasi: z.string().optional().or(z.literal('')),
  no_rfid: z.string().optional().or(z.literal('')),
  foto: z.string().optional().or(z.literal('')),
  
  // Detail Alamat & Domisili
  dusun: z.string().optional().or(z.literal('')),
  rt: z.string().optional().or(z.literal('')),
  rw: z.string().optional().or(z.literal('')),
  kelurahan: z.string().optional().or(z.literal('')),
  kecamatan: z.string().optional().or(z.literal('')),
  kabupaten: z.string().optional().or(z.literal('')),
  provinsi: z.string().optional().or(z.literal('')),
  kode_pos: z.string().optional().or(z.literal('')),
  lintang: z.string().optional().or(z.literal('')),
  bujur: z.string().optional().or(z.literal('')),
  koordinat: z.string().optional().or(z.literal('')),

  // Sekolah Asal
  sekolah_asal: z.string().optional().or(z.literal('')),
  no_ijazah_smp: z.string().optional().or(z.literal('')),

  // Data Ayah
  nama_ayah: z.string().optional().or(z.literal('')),
  nik_ayah: z.string().optional().or(z.literal('')),
  no_hp_ayah: z.string().optional().or(z.literal('')),
  pekerjaan_ayah: z.string().optional().or(z.literal('')),
  pendidikan_ayah: z.string().optional().or(z.literal('')),
  penghasilan_ayah: z.string().optional().or(z.literal('')),
  
  // Data Ibu
  nama_ibu: z.string().optional().or(z.literal('')),
  nik_ibu: z.string().optional().or(z.literal('')),
  no_hp_ibu: z.string().optional().or(z.literal('')),
  pekerjaan_ibu: z.string().optional().or(z.literal('')),
  pendidikan_ibu: z.string().optional().or(z.literal('')),
  penghasilan_ibu: z.string().optional().or(z.literal('')),
  
  // Data Wali
  nama_wali: z.string().optional().or(z.literal('')),
  nik_wali: z.string().optional().or(z.literal('')),
  no_hp_wali: z.string().optional().or(z.literal('')),
  hubungan_wali: z.string().optional().or(z.literal('')),
  pekerjaan_wali: z.string().optional().or(z.literal('')),
  penghasilan_wali: z.string().optional().or(z.literal('')),
  no_hp_ortu: z.string().optional().or(z.literal('')),
  
  // Kontak Orang Tua (Array)
  orang_tua: z.array(z.object({
    id: z.string().optional(),
    nama: z.string().min(1, 'Nama wajib diisi'),
    hubungan: z.string().optional(),
    no_hp: z.string().optional(),
    email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
    nik: z.string().optional()
  })).optional()
});

export type SiswaFormValues = z.infer<typeof siswaSchema>;
