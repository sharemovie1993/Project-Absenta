// Academic Module Types - Generated from Prisma Schema
import type { User } from '../api/user.api';

// Re-export User type for use in other modules
export type { User };

export interface Guru {
  id: string;
  tenant_id: string;
  user_id: string;
  nip?: string;
  nama_guru: string;
  no_rfid?: string;
  email?: string;
  no_hp?: string;
  alamat?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: 'L' | 'P';
  agama?: string;
  status_kepegawaian?: 'PNS' | 'HONORER' | 'KONTRAK';
  pendidikan_terakhir?: string;
  jabatan?: string;
  wali_kelas_di?: { id: string; nama_kelas: string };
  created_at: Date;
  updated_at: Date;
  
  // Relations
  Tenant?: Tenant;
  User?: User;
  GuruMapel?: GuruMapel[];
  WaliKelas?: WaliKelas[];
  SesiAbsensi?: SesiAbsensi[];
  AbsenGuru?: AbsenGuru[];
}

export interface OrangTua {
  id: string;
  tenant_id: string;
  siswa_id: string;
  nama: string;
  nik?: string | null;
  hubungan?: string | null;
  pekerjaan?: string | null;
  pendidikan?: string | null;
  penghasilan?: string | null;
  email?: string | null;
  no_hp?: string | null;
  created_at?: Date;
}

export interface Siswa {
  id: string;
  tenant_id: string;
  user_id?: string;
  nis: string;
  nisn?: string;
  nik?: string;
  nama_siswa: string;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir?: string;
  tanggal_lahir?: string;
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
  kebutuhan_khusus?: string;
  penerima_kps?: boolean;
  penerima_kip?: boolean;
  no_kip?: string;
  kelas_id: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  tanggal_masuk?: string;
  tanggal_keluar?: string;
  alasan_keluar?: string;
  status: 'AKTIF' | 'TIDAK_AKTIF' | 'LULUS' | 'PINDAH' | 'KELUAR';
  no_rfid?: string;
  foto?: string;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  Tenant?: Tenant;
  User?: User;
  Kelas?: Kelas;
  TahunPelajaran?: TahunPelajaran;
  Semester?: Semester;
  AbsenSiswa?: AbsenSiswa[];
  OrangTua?: OrangTua[];
}

export interface Kelas {
  id: string;
  tenant_id: string;
  nama_kelas: string;
  tingkat: number;
  jurusan_id?: string;
  kapasitas?: number;
  keterangan?: string;
  jam_masuk?: string | null;
  jam_pulang?: string | null;
  device_id?: string | null;
  is_active: boolean;

  created_at: Date;
  updated_at: Date;
  _count?: {
    Siswa: number;
  };
  
  // Relations
  Tenant?: Tenant;
  Jurusan?: {
    id: string;
    nama: string;
    program_keahlian_id?: string | null;
    ProgramKeahlian?: {
      id: string;
      nama: string;
    } | null;
  };

  Siswa?: Siswa[];
  WaliKelas?: {
    id: string;
    Guru: {
      id: string;
      nama_guru: string;
    };
  }[];
  SesiAbsensi?: SesiAbsensi[];
}

export interface Mapel {
  id: string;
  tenant_id: string;
  nama_mapel: string;
  kode_mapel?: string;
  tingkat?: number;
  created_at: string;
  updated_at: string;
  _count?: {
    GuruMapel: number;
  };
  
  // Relations
  Tenant?: Tenant;
  GuruMapel?: GuruMapel[];
  KelasMapel?: KelasMapel[];
  SesiAbsensi?: SesiAbsensi[];
}

export interface TahunPelajaran {
  id: string;
  tenant_id: string;
  tahun: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  Tenant?: Tenant;
  Semester?: Semester[];
  Siswa?: Siswa[];
  _count?: {
    Siswa: number;
    Semester: number;
  };
}

export interface Semester {
  id: string;
  tenant_id: string;
  nama_semester: string;
  tahun_pelajaran_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  Tenant?: Tenant;
  TahunPelajaran?: TahunPelajaran;
  Siswa?: Siswa[];
  SesiAbsensi?: SesiAbsensi[];
}

export interface ProgramKeahlian {
  id: string;
  tenant_id: string;
  nama: string;
  kode?: string | null;
  singkatan?: string | null;
  bidang_keahlian?: string | null;
  created_at: Date;
  updated_at: Date;
  _count?: {
    Jurusan: number;
  };
}

export interface Jurusan {
  id: string;
  tenant_id: string;
  nama: string;
  kode?: string;
  singkatan?: string;
  program_keahlian_id?: string | null;
  created_at: Date;
  updated_at: Date;
  _count?: {
    Kelas: number;
  };
  
  // Relations
  Tenant?: Tenant;
  Kelas?: Kelas[];
  Mapel?: Mapel[];
  ProgramKeahlian?: ProgramKeahlian | null;
}

// Supporting types
export interface GuruMapel {
  id: string;
  tenant_id: string;
  guru_id: string;
  mapel_id: string;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  Guru?: Guru;
  Mapel?: Mapel;
}

export interface KelasMapel {
  id: string;
  tenant_id: string;
  kelas_id: string;
  mapel_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface WaliKelas {
  id: string;
  guru_id: string;
  kelas_id: string;
  tahun_pelajaran_id: string;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  Guru?: Guru;
  Kelas?: Kelas;
  TahunPelajaran?: TahunPelajaran;
}

export interface WaliKelasStrukturAssignment {
  id: string;
  tenant_id: string;
  guru_id: string;
  struktur_organisasi_id: string;
  is_active: boolean;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
  Guru?: Pick<Guru, 'id' | 'nama_guru' | 'nip'>;
  StrukturOrganisasi?: {
    id: string;
    kode: string;
    kelas_id?: string | null;
    Kelas?: Pick<Kelas, 'id' | 'nama_kelas' | 'tingkat'>;
  };
}


export interface SesiAbsensi {
  id: string;
  tenant_id: string;
  guru_id: string;
  kelas_id: string;
  mapel_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  tanggal: Date;
  jam_mulai: Date;
  jam_selesai?: Date;
  materi?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface AbsenSiswa {
  id: string;
  sesi_absensi_id: string;
  siswa_id: string;
  status_absen: string;
  keterangan?: string;
  jam_absen?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AbsenGuru {
  id: string;
  guru_id: string;
  tanggal: Date;
  jam_masuk?: Date;
  jam_keluar?: Date;
  status_absen: string;
  keterangan?: string;
  created_at: Date;
  updated_at: Date;
}

// Tenant interface - aligned with tenants.api.ts
export interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  kepala_sekolah?: string | null;
  nip_kepala?: string | null;
  allow_manual_hadir_gate?: boolean;
}



// Form types for creating/updating
export type CreateGuruData = Omit<Guru, 'id' | 'created_at' | 'updated_at'>;
export type UpdateGuruData = Partial<CreateGuruData>;

export type CreateSiswaData = Omit<Siswa, 'id' | 'created_at' | 'updated_at' | 'tenant_id'> & {
  orang_tua?: any[];
};
export type UpdateSiswaData = Partial<CreateSiswaData>;

export type CreateKelasData = Omit<Kelas, 'id' | 'created_at' | 'updated_at'>;
export type UpdateKelasData = Partial<CreateKelasData>;

export type CreateMapelData = {
  nama_mapel: string;
  kode_mapel?: string;
  tingkat?: number;
};

export type UpdateMapelData = Partial<CreateMapelData>;

export type CreateTahunPelajaranData = Omit<TahunPelajaran, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
export type UpdateTahunPelajaranData = Partial<CreateTahunPelajaranData>;

export type CreateSemesterData = Omit<Semester, 'id' | 'created_at' | 'updated_at'>;
export type UpdateSemesterData = Partial<CreateSemesterData>;

export type CreateJurusanData = Omit<Jurusan, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
export type UpdateJurusanData = Partial<CreateJurusanData>;

// API Response types
export interface AcademicApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface AcademicListResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  error?: string;
}

// Filter and query types
export interface AcademicQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tingkat?: number;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  kelas_id?: string;
  status?: string;
  kategori?: string;
  search_fields?: string[];
  user_id?: string;
}
