// Define ENUMs manually since they're not used in schema models
export enum RoleName {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  GURU = 'GURU',
  SISWA = 'SISWA'
}

export enum JenisKelamin {
  L = 'L',
  P = 'P'
}

export enum SiswaStatus {
  AKTIF = 'AKTIF',
  LULUS = 'LULUS',
  KELUAR = 'KELUAR',
  PINDAH = 'PINDAH'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum BillingStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export enum SesiStatus {
  DRAFT = 'DRAFT',
  BERLANGSUNG = 'BERLANGSUNG',
  SELESAI = 'SELESAI'
}

export enum AbsenStatus {
  HADIR = 'HADIR',
  ALPA = 'ALPA',
  IZIN = 'IZIN',
  SAKIT = 'SAKIT',
  DISPEN = 'DISPEN'
}

export enum JenisTap {
  GERBANG_DATANG = 'GERBANG_DATANG',
  GERBANG_PULANG = 'GERBANG_PULANG',
  KELAS = 'KELAS',
  GERBANG_LAINNYA = 'GERBANG_LAINNYA'
}

// Import Prisma ENUMs with different names to avoid conflicts
import { 
  AbsensiMode as PrismaAbsensiMode,
  JenisKegiatan as PrismaJenisKegiatan
} from '@prisma/client';

// Re-export Prisma ENUMs with original names
export { 
  AbsensiMode,
  JenisKegiatan
} from '@prisma/client';

// Helper arrays for validation
export const VALID_ROLES = Object.values(RoleName);
export const VALID_JENIS_KELAMIN = Object.values(JenisKelamin);
export const VALID_SISWA_STATUS = Object.values(SiswaStatus);
export const VALID_SUBSCRIPTION_STATUS = Object.values(SubscriptionStatus);
export const VALID_BILLING_STATUS = Object.values(BillingStatus);
export const VALID_ABSENSI_MODE = Object.values(PrismaAbsensiMode);
export const VALID_SESI_STATUS = Object.values(SesiStatus);
export const VALID_ABSEN_STATUS = Object.values(AbsenStatus);
export const VALID_JENIS_TAP = Object.values(JenisTap);
export const VALID_JENIS_KEGIATAN = Object.values(PrismaJenisKegiatan);
