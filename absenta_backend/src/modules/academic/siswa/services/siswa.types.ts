import type { DataScope } from '@/types/fastify';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  user_id?: string;
  kelas_id?: string;
  status?: string;
  searchFields?: string[];
  context?: string;
  tingkat?: string | number;
  gender?: string;
}

export interface SiswaResponse {
  id: string;
  nama_siswa: string;
  nis: string;
  nisn?: string | null;
  User?: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  Kelas?: {
    id: string;
    nama_kelas: string;
    tingkat: string | number;
  } | null;
  OrangTua?: any[];
  [key: string]: any;
}

export interface PaginatedSiswaResponse {
  data: SiswaResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateSiswaInput {
  nama_siswa: string;
  kelas_id: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  nis?: string;
  nisn?: string;
  nik?: string;
  email?: string;
  user_id?: string;
  jenis_kelamin?: string;
  tempat_lahir?: string;
  tanggal_lahir?: Date | string;
  alamat?: string;
  dusun?: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  rt?: string;
  rw?: string;
  kode_pos?: string;
  no_hp?: string;
  transportasi?: string;
  nama_ayah?: string;
  nik_ayah?: string;
  pekerjaan_ayah?: string;
  pendidikan_ayah?: string;
  penghasilan_ayah?: string;
  nama_ibu?: string;
  nik_ibu?: string;
  pekerjaan_ibu?: string;
  pendidikan_ibu?: string;
  penghasilan_ibu?: string;
  nama_wali?: string;
  hubungan_wali?: string;
  pekerjaan_wali?: string;
  penghasilan_wali?: string;
  anak_ke?: number;
  penerima_kps?: boolean;
  penerima_kip?: boolean;
  no_kip?: string;
  tanggal_masuk?: Date | string;
  status?: string;
  no_rfid?: string;
  foto?: string;
  orang_tua?: any[];
  skipQuotaCheck?: boolean;
  [key: string]: any;
}

export interface UpdateSiswaInput extends Partial<CreateSiswaInput> {
  tanggal_keluar?: Date | string;
  alasan_keluar?: string;
}

export type SiswaScope = DataScope;

