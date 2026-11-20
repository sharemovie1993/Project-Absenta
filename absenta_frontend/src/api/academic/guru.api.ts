import { requestWithFallback, downloadBlob } from '../apiUtils';
import { importDataFromExcel } from '../../utils/import.utils';
import type { Guru } from "../../types/academic";

// ── Query Key Factory ──────────────────────────────────────────────────────
export const guruQueryKeys = {
  all: ['guru'] as const,
  lists: () => [...guruQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...guruQueryKeys.lists(), filters] as const,
  detail: (id: string) => [...guruQueryKeys.all, 'detail', id] as const,
};


export interface PaginatedGuruResponse {
  success: boolean;
  message: string;
  data: Guru[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleGuruResponse {
  success: boolean;
  message: string;
  data: Guru;
}

export interface CreateGuruPayload {
  user_id?: string;
  nama_guru: string;
  nip?: string;
  nuptk?: string;
  nik?: string;
  no_kk?: string;
  npwp?: string;
  nama_ibu_kandung?: string;
  no_rfid?: string;
  email?: string;
  no_hp?: string;
  alamat?: string;
  dusun?: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  rt?: string;
  rw?: string;
  kode_pos?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: 'L' | 'P';
  agama?: string;
  status_kepegawaian?: 'PNS' | 'HONORER' | 'KONTRAK';
  pendidikan_terakhir?: string;
  pangkat_golongan?: string;
  jabatan?: string;
  tmt_guru?: string;
  max_jp?: number;
  jenis_ptk?: string;
  foto?: string;
}

export interface UpdateGuruPayload {
  nama_guru?: string;
  nip?: string;
  nuptk?: string;
  nik?: string;
  no_kk?: string;
  npwp?: string;
  nama_ibu_kandung?: string;
  no_rfid?: string;
  status?: string;
  email?: string;
  no_hp?: string;
  alamat?: string;
  dusun?: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  rt?: string;
  rw?: string;
  kode_pos?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: string;
  agama?: string;
  status_kepegawaian?: string;
  pendidikan_terakhir?: string;
  pangkat_golongan?: string;
  jabatan?: string;
  tmt_guru?: string;
  max_jp?: number;
  jenis_ptk?: string;
  foto?: string;
}

export interface GuruPosition {
  id: string;
  code: string;
  name: string;
  scope_type: string;
  order: number;
}

// Get Active Organizational Positions - GET /api/academic/guru/positions
export const getGuruPositions = async (): Promise<GuruPosition[]> => {
  const res = await requestWithFallback<{ success: boolean; data: GuruPosition[] }>('get', '/academic/guru/positions');
  return res.data || [];
};

// Get Guru List - GET /api/academic/guru
export const getGuruList = async (
  page = 1, 
  limit = 10, 
  search = "",
  status_kepegawaian = "",
  jenis_kelamin = "",
  jenis_ptk = "",
  tahun_pelajaran_id = "",
  position_code = "",
  is_app_installed: boolean | string = ""
): Promise<PaginatedGuruResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search
  });
  if (status_kepegawaian && status_kepegawaian !== 'ALL') params.append('status_kepegawaian', status_kepegawaian);
  if (jenis_kelamin && jenis_kelamin !== 'ALL') params.append('jenis_kelamin', jenis_kelamin);
  if (jenis_ptk && jenis_ptk !== 'ALL') params.append('jenis_ptk', jenis_ptk);
  if (tahun_pelajaran_id && tahun_pelajaran_id !== 'ALL') params.append('tahun_pelajaran_id', tahun_pelajaran_id);
  if (position_code && position_code !== 'ALL') params.append('position_code', position_code);
  if (is_app_installed !== undefined && is_app_installed !== '' && is_app_installed !== 'ALL') {
    params.append('is_app_installed', String(is_app_installed));
  }

  return requestWithFallback<PaginatedGuruResponse>('get', `/academic/guru?${params.toString()}`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};

export interface GuruAppTelemetryPayload {
  is_installed: boolean;
  platform?: string;
  app_version?: string;
  ota_version?: string;
  device_model?: string;
  device_os?: string;
  device_uuid?: string;
}

export const syncGuruAppTelemetryApi = async (data: GuruAppTelemetryPayload): Promise<{ success: boolean; data?: any }> => {
  return requestWithFallback<{ success: boolean; data?: any }>('post', '/academic/guru/telemetry', { data });
};

export const getGuruAppTelemetryStats = async (): Promise<{
  success: boolean;
  data: {
    total_guru: number;
    total_installed: number;
    total_not_installed: number;
    percentage: number;
  };
}> => {
  return requestWithFallback<{ success: boolean; data: any }>('get', '/academic/guru/telemetry/stats');
};

// Get Guru Detail - GET /api/academic/guru/:id
export const getGuruDetail = async (id: string): Promise<Guru> => {
  const res = await requestWithFallback<SingleGuruResponse>('get', `/academic/guru/${id}`);
  return res.data;
};

// Create Guru - POST /api/academic/guru
export const createGuru = async (payload: CreateGuruPayload): Promise<SingleGuruResponse> => {
  return requestWithFallback<SingleGuruResponse>('post', "/academic/guru", { data: payload });
};

// Update Guru - PUT /api/academic/guru/:id
export const updateGuru = async (
  id: string, 
  payload: UpdateGuruPayload
): Promise<SingleGuruResponse> => {
  return requestWithFallback<SingleGuruResponse>('put', `/academic/guru/${id}`, { 
    data: payload,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};

// Proxy Update Max JP - PATCH /api/academic/guru/:id/max-jp
export const updateGuruMaxJp = async (id: string, max_jp: number): Promise<SingleGuruResponse> => {
  return requestWithFallback<SingleGuruResponse>('patch', `/academic/guru/${id}/max-jp`, {
    data: { max_jp },
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};

// Delete Guru - DELETE /api/academic/guru/:id
export const deleteGuru = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/guru/${id}`);
};

export const downloadGuruImportTemplate = async (): Promise<Blob> => {
  return downloadBlob('/academic/guru/import/template');
};

export const importGuruFromExcel = async (
  file: File,
  onProgress?: (percent: number) => void,
  socketId?: string
) => {
  return importDataFromExcel('/academic/guru/import', file, onProgress, socketId);
};

export const exportGuruToExcel = async (): Promise<Blob> => {
  return downloadBlob('/academic/guru/export');
};

export const normalizeGuruWaPhones = async (): Promise<{
  success: boolean;
  message: string;
  data: { total: number; updated: number; unchanged: number; invalid: number };
}> => {
  return requestWithFallback('post', '/academic/guru/normalize-wa-phones');
};

export interface BulkResetGuruPasswordPayload {
  mode: 'NIP' | 'CUSTOM';
  customPassword?: string;
  targetScope: 'ALL' | 'SELECTED';
  guru_ids?: string[];
}

export const bulkResetGuruPassword = async (payload: BulkResetGuruPasswordPayload): Promise<{
  success: boolean;
  message: string;
  total: number;
  updated: number;
  created: number;
  failed: number;
  errors?: any[];
}> => {
  return requestWithFallback('post', '/academic/guru/bulk-reset-password', { data: payload, timeout: 300000 });
};
