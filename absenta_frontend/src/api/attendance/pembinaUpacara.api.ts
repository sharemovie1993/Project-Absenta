import { requestWithFallback } from '../apiUtils';

export type StatusPelaksanaanUpacara = 'DIJADWALKAN' | 'SELESAI' | 'DIGANTIKAN' | 'DIBATALKAN';

export interface JadwalPembinaUpacaraItem {
  id: string;
  tenant_id: string;
  tahun_pelajaran_id: string;
  semester_id: string | null;
  tanggal: string; // ISO date string
  guru_id: string;
  guru_pengganti_id: string | null;
  kelas_petugas_id: string | null;
  jadwal_kegiatan_id: string | null;
  tema_amanat: string | null;
  catatan: string | null;
  status: StatusPelaksanaanUpacara;
  created_at: string;
  updated_at: string;
  GuruUtama?: {
    id: string;
    nama_guru: string;
    nip: string | null;
  };
  GuruPengganti?: {
    id: string;
    nama_guru: string;
    nip: string | null;
  } | null;
  KelasPetugas?: {
    id: string;
    nama_kelas: string;
  } | null;
  TahunPelajaran?: {
    id: string;
    tahun: string;
  };
  Semester?: {
    id: string;
    nama_semester: string;
  };
}

export interface CreatePembinaUpacaraPayload {
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  tanggal: string; // YYYY-MM-DD
  guru_id: string;
  guru_pengganti_id?: string | null;
  kelas_petugas_id?: string | null;
  jadwal_kegiatan_id?: string | null;
  tema_amanat?: string | null;
  catatan?: string | null;
  status?: StatusPelaksanaanUpacara;
}

export interface AutoGenerateUpacaraPayload {
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  tanggal_mulai?: string; // YYYY-MM-DD
  tanggal_selesai?: string; // YYYY-MM-DD
  guru_ids: string[];
  kelas_ids?: string[];
  tema_presets?: string[];
}

export interface PembinaUpacaraResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const pembinaUpacaraApi = {
  getAll: async (params?: {
    tahun_pelajaran_id?: string;
    semester_id?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PembinaUpacaraResponse<JadwalPembinaUpacaraItem[]>> => {
    return requestWithFallback<PembinaUpacaraResponse<JadwalPembinaUpacaraItem[]>>(
      'get',
      '/kesiswaan/pembina-upacara',
      { params }
    );
  },

  getById: async (id: string): Promise<PembinaUpacaraResponse<JadwalPembinaUpacaraItem>> => {
    return requestWithFallback<PembinaUpacaraResponse<JadwalPembinaUpacaraItem>>(
      'get',
      `/kesiswaan/pembina-upacara/${id}`
    );
  },

  create: async (payload: CreatePembinaUpacaraPayload): Promise<PembinaUpacaraResponse<JadwalPembinaUpacaraItem>> => {
    return requestWithFallback<PembinaUpacaraResponse<JadwalPembinaUpacaraItem>>(
      'post',
      '/kesiswaan/pembina-upacara',
      { data: payload }
    );
  },

  update: async (
    id: string,
    payload: Partial<CreatePembinaUpacaraPayload>
  ): Promise<PembinaUpacaraResponse<JadwalPembinaUpacaraItem>> => {
    return requestWithFallback<PembinaUpacaraResponse<JadwalPembinaUpacaraItem>>(
      'put',
      `/kesiswaan/pembina-upacara/${id}`,
      { data: payload }
    );
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return requestWithFallback<{ success: boolean; message: string }>(
      'delete',
      `/kesiswaan/pembina-upacara/${id}`
    );
  },

  autoGenerate: async (payload: AutoGenerateUpacaraPayload): Promise<PembinaUpacaraResponse<{ count: number; items: JadwalPembinaUpacaraItem[] }>> => {
    return requestWithFallback<PembinaUpacaraResponse<{ count: number; items: JadwalPembinaUpacaraItem[] }>>(
      'post',
      '/kesiswaan/pembina-upacara/auto-generate',
      { data: payload }
    );
  },
};
