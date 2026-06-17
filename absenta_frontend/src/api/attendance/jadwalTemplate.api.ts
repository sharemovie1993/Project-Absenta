import { requestWithFallback } from '../apiUtils';
import { importDataFromExcel } from '../../utils/import.utils';

export interface JadwalTemplate {
  id: string;
  tenant_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  kelas_id: string;
  hari: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU';
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
  jam_mulai: string;
  jam_selesai: string;
  mapel_id?: string;
  guru_id?: string;
  jenis_kegiatan: string;
}

export type UpdateJadwalPayload = Partial<CreateJadwalPayload>;

export interface JadwalTemplateFilters {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  kelas_id?: string;
  guru_id?: string;
  hari?: string;
}

export const getJadwalTemplate = async (filters?: JadwalTemplateFilters) => {
  const q: Record<string, unknown> | undefined = filters ? { ...filters } : undefined;
  return requestWithFallback<any>('get', '/attendance/jadwal-template', { 
    params: q,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};

export const getMyJadwalTemplate = async (params?: { tanggal?: string; hari?: string }) => {
  return requestWithFallback<{ success: boolean; message?: string; data: JadwalTemplate[] }>('get', '/attendance/jadwal-template/my', {
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};

export const createJadwalTemplate = async (payload: CreateJadwalPayload) => {
  return requestWithFallback<any>('post', '/attendance/jadwal-template', { data: payload });
};

export const updateJadwalTemplate = async (id: string, payload: UpdateJadwalPayload) => {
  return requestWithFallback<any>('put', `/attendance/jadwal-template/${id}`, { data: payload });
};

export const deleteJadwalTemplate = async (id: string) => {
  return requestWithFallback<any>('delete', `/attendance/jadwal-template/${id}`);
};

export const importJadwalFromExcel = async (
  file: File,
  tahunPelajaranId: string,
  semesterId: string,
  onProgress?: (progress: number) => void
) => {
  const url = `/attendance/jadwal-template/import?tahun_pelajaran_id=${tahunPelajaranId}&semester_id=${semesterId}`;
  return importDataFromExcel(url, file, onProgress);
};
