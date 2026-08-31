import { requestWithFallback } from '../apiUtils';

export interface JadwalKontrakKbmItem {
  id: string;
  tenant_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  kelas_id: string;
  guru_id: string | null;
  mapel_id: string | null;
  ruangan_id: string | null;
  jumlah_kartu: number;
  durasi_jp: number;
  total_jp: number;
  aturan_blok: string;
  is_pembiasaan: boolean;
  asc_lesson_id: string | null;
  created_at: string;
  updated_at: string;
  Kelas?: { id: string; nama_kelas: string; tingkat: number };
  Guru?: { id: string; nama_guru: string } | null;
  Mapel?: { id: string; nama_mapel: string; kode_mapel?: string } | null;
  TahunPelajaran?: { id: string; tahun?: string; nama?: string };
  Semester?: { id: string; nama_semester?: string; nama?: string };
  MasterRuangan?: { id: string; nama_ruangan: string } | null;
}

export interface ListJadwalKontrakKbmResponse {
  success: boolean;
  message: string;
  data: JadwalKontrakKbmItem[];
  total: number;
}

export interface SummaryJadwalKontrakKbmResponse {
  success: boolean;
  message: string;
  data: {
    total_kontrak: number;
    total_kelas_terlibat: number;
    total_guru_terlibat: number;
  };
}

export interface UpdateJadwalKontrakKbmPayload {
  guru_id?: string | null;
  mapel_id?: string | null;
  jumlah_kartu?: number;
  durasi_jp?: number;
  total_jp?: number;
  aturan_blok?: string;
  ruangan_id?: string | null;
}

export interface ListJadwalKontrakKbmFilters {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  kelas_id?: string;
  guru_id?: string;
  mapel_id?: string;
  search?: string;
}

// GET /api/academic/jadwal-kontrak-kbm
export const listJadwalKontrakKbm = async (
  filters?: ListJadwalKontrakKbmFilters
): Promise<ListJadwalKontrakKbmResponse> => {
  const params = new URLSearchParams();
  if (filters?.tahun_pelajaran_id) params.append('tahun_pelajaran_id', filters.tahun_pelajaran_id);
  if (filters?.semester_id) params.append('semester_id', filters.semester_id);
  if (filters?.kelas_id) params.append('kelas_id', filters.kelas_id);
  if (filters?.guru_id) params.append('guru_id', filters.guru_id);
  if (filters?.mapel_id) params.append('mapel_id', filters.mapel_id);
  if (filters?.search) params.append('search', filters.search);
  const url = `/academic/jadwal-kontrak-kbm${params.toString() ? `?${params.toString()}` : ''}`;
  return requestWithFallback<ListJadwalKontrakKbmResponse>('get', url);
};

// GET /api/academic/jadwal-kontrak-kbm/summary
export const getJadwalKontrakKbmSummary = async (
  filters?: { tahun_pelajaran_id?: string; semester_id?: string }
): Promise<SummaryJadwalKontrakKbmResponse> => {
  const params = new URLSearchParams();
  if (filters?.tahun_pelajaran_id) params.append('tahun_pelajaran_id', filters.tahun_pelajaran_id);
  if (filters?.semester_id) params.append('semester_id', filters.semester_id);
  const url = `/academic/jadwal-kontrak-kbm/summary${params.toString() ? `?${params.toString()}` : ''}`;
  return requestWithFallback<SummaryJadwalKontrakKbmResponse>('get', url);
};

// PATCH /api/academic/jadwal-kontrak-kbm/:id
export const updateJadwalKontrakKbm = async (
  id: string,
  payload: UpdateJadwalKontrakKbmPayload
): Promise<{ success: boolean; message: string; data: JadwalKontrakKbmItem }> => {
  return requestWithFallback('patch', `/academic/jadwal-kontrak-kbm/${id}`, { data: payload });
};

// DELETE /api/academic/jadwal-kontrak-kbm/:id
export const deleteJadwalKontrakKbm = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback('delete', `/academic/jadwal-kontrak-kbm/${id}`);
};
