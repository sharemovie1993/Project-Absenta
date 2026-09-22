// Tipe data yang digunakan oleh modul Penempatan PKL (Hubin)
import { HubinJurnalStatus, HubinPklStatus } from '../../../constants/HubinConstants';

export interface SiswaData {
  id: string;
  nama_siswa: string;
  nis: string;
  no_hp?: string;
  foto?: string | null;
  foto_url?: string | null;
  Kelas?: {
    id: string;
    nama_kelas: string;
  };
  TahunPelajaran?: {
    id: string;
    tahun: string;
  };
}

export interface MitraData {
  id: string;
  nama: string;
  alamat?: string;
  kontak?: string;
}

export interface PembimbingData {
  id: string;
  nama_guru: string;
  full_name?: string;
  user_id?: string;
}

export interface SiswaPkl {
  id: string;
  siswa_id: string;
  mitra_id: string;
  pembimbing_id: string;
  status: HubinPklStatus;
  tanggal_mulai: string;
  tanggal_selesai: string;
  siswa_akademik_id?: string | null;
  Siswa?: SiswaData;
  SiswaAkademik?: {
    id: string;
    tahun_pelajaran_id: string;
    semester_id: string;
    tahunPelajaran?: { id: string; tahun: string };
    semester?: { id: string; nama_semester: string };
  };
  Mitra?: MitraData;
  Pembimbing?: PembimbingData;
  kunjungan_json?: Array<{
    catatan: string;
    catatan_dudi?: string;
    foto_url?: string;
    latitude?: number;
    longitude?: number;
    tanggal?: string;
  }>;
  nilai_json?: {
    soft_skills: number;
    technical_skills: number;
    discipline: number;
    catatan?: string;
    nilai_akhir: number;
  };
  jurnal_json?: {
    file_url?: string;
    status?: HubinJurnalStatus;
    catatan_revisi?: string;
  };
}

export interface CreatePenempatanPayload {
  siswa_id: string;
  mitra_id: string;
  pembimbing_id: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  status: string;
  tahun_pelajaran_id?: string | null;
  semester_id?: string | null;
  kelas_id?: string | null;
}

export interface PenilaianPayload {
  soft_skills: number;
  technical_skills: number;
  discipline: number;
  catatan: string;
  nilai_akhir: number;
}

export interface KunjunganPayload {
  tanggal?: string;
  catatan: string;
  catatan_dudi?: string;
  foto_url?: string;
  latitude?: number;
  longitude?: number;
}
