import { z } from 'zod';

export const sarprasCategorySchema = z.object({
  nama: z.string().min(1, 'Nama kategori wajib diisi'),
  deskripsi: z.string().optional(),
});

export const sarprasLocationSchema = z.object({
  nama: z.string().min(1, 'Nama lokasi wajib diisi'),
  deskripsi: z.string().optional(),
  unit_id: z.string().uuid('ID Unit tidak valid').optional(),
  kelas_id: z.string().uuid('ID Kelas tidak valid').optional(),
});

export const sarprasAssetSchema = z.object({
  nama: z.string().min(1, 'Nama aset wajib diisi'),
  brand: z.string().optional(),
  serial_number: z.string().optional(),
  kode: z.string().optional(),
  kondisi: z.enum(['BAIK', 'RUSAK', 'PERBAIKAN', 'HILANG']).default('BAIK'),
  jumlah: z.number().int('Jumlah harus berupa angka bulat').positive('Jumlah minimal 1').default(1),
  is_loanable: z.boolean().default(true),
  purchase_date: z.union([z.date(), z.string()]).transform((v) => new Date(v)).optional(),
  price_purchase: z.number().nonnegative('Harga pembelian tidak boleh negatif').optional(),
  image_url: z.string().optional(),
  deskripsi: z.string().optional(),
  category_id: z.string().uuid('ID Kategori tidak valid').optional(),
  location_id: z.string().uuid('ID Lokasi tidak valid').optional(),
  sumber_dana: z.string().optional(),
});

export const updateSarprasAssetSchema = sarprasAssetSchema.partial();

export const sarprasLoanRequestSchema = z.object({
  asset_id: z.string().uuid('ID Aset tidak valid'),
  tanggal_pinjam: z.union([z.date(), z.string()]).transform((v) => new Date(v)).optional(),
  tanggal_kembali_plan: z.union([z.date(), z.string()]).transform((v) => new Date(v)).optional(),
  peminjam_id: z.string().optional(),
  catatan: z.string().optional(),
});

export const sarprasLoanStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'ACTIVE', 'RETURNED']),
  condition_on_return: z.enum(['BAIK', 'RUSAK', 'PERBAIKAN', 'HILANG']).optional(),
  return_catatan: z.string().optional(),
});

export const sarprasAssetRepairSchema = z.object({
  asset_id: z.string().uuid('ID Aset tidak valid'),
  tanggal_mulai: z.union([z.date(), z.string()]).transform((v) => new Date(v)).optional(),
  tanggal_selesai: z.union([z.date(), z.string()]).transform((v) => new Date(v)).optional(),
  biaya: z.number().nonnegative('Biaya perbaikan tidak boleh negatif').default(0),
  teknisi: z.string().optional(),
  deskripsi: z.string().optional(),
  status: z.enum(['PROSES', 'SELESAI', 'BATAL']).default('PROSES'),
  foto_kerusakan: z.string().optional(),
});

export const updateSarprasAssetRepairSchema = sarprasAssetRepairSchema.partial();

export const sarprasCatalogSchema = z.object({
  nama: z.string().min(1, 'Nama item katalog wajib diisi'),
  brand: z.string().optional().nullable(),
  category_name: z.string().min(1, 'Kategori kelompok wajib diisi'),
  is_loanable: z.boolean().default(true),
  deskripsi: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

export const updateSarprasCatalogSchema = sarprasCatalogSchema.partial();
