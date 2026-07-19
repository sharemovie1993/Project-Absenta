import { requestWithFallback } from '../apiUtils';
import { importDataFromExcel } from '../../utils/import.utils';

export interface JadwalKBM {
  id: string;
  tenant_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  kelas_id: string;
  hari: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU';
  slot_index: number;
  jam_mulai: string;
  jam_selesai: string;
  jenis_kegiatan?: string;
  mapel_id?: string;
  guru_id?: string;
  Mapel?: {
    nama_mapel: string;
    kode_mapel: string;
  };
  Guru?: {
    id: string;
    User?: {
      full_name: string;
    };
  };
  Kelas?: {
    id: string;
    nama_kelas: string;
  };
}

export interface CreateJadwalPayload {
  tahun_pelajaran_id: string;
  semester_id: string;
  kelas_id: string;
  hari: string;
  slot_index: number;
  jam_mulai: string;
  jam_selesai: string;
  mapel_id?: string;
  guru_id?: string;
  jenis_kegiatan: string;
}

export type UpdateJadwalPayload = Partial<CreateJadwalPayload>;

export interface JadwalKBMFilters {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  kelas_id?: string;
  guru_id?: string;
  hari?: string;
}

export const getJadwalKBM = async (filters?: JadwalKBMFilters) => {
  const q: Record<string, unknown> = filters ? { ...filters, _t: Date.now() } : { _t: Date.now() };
  return requestWithFallback<any>('get', '/kurikulum/jadwal-kbm', { 
    params: q,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};

export const getMyJadwalKBM = async (params?: { tanggal?: string; hari?: string }) => {
  return requestWithFallback<{ success: boolean; message?: string; data: JadwalKBM[] }>('get', '/kurikulum/jadwal-kbm/my', {
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};

export const createJadwalKBM = async (payload: CreateJadwalPayload) => {
  return requestWithFallback<any>('post', '/kurikulum/jadwal-kbm', { data: payload });
};

export const updateJadwalKBM = async (id: string, payload: UpdateJadwalPayload) => {
  return requestWithFallback<any>('put', `/kurikulum/jadwal-kbm/${id}`, { data: payload });
};

export const deleteJadwalKBM = async (id: string) => {
  return requestWithFallback<any>('delete', `/kurikulum/jadwal-kbm/${id}`);
};

export const importJadwalFromExcel = async (
  file: File,
  tahunPelajaranId: string,
  semesterId: string,
  onProgress?: (progress: number) => void
) => {
  const url = `/kurikulum/jadwal-kbm/import?tahun_pelajaran_id=${tahunPelajaranId}&semester_id=${semesterId}`;
  return importDataFromExcel(url, file, onProgress);
};
