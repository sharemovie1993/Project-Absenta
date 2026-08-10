import { requestWithFallback, downloadBlob } from '../apiUtils';
import type { Siswa, CreateSiswaData, UpdateSiswaData } from '../../types/academic';

// Re-export types used by components
export type { Siswa, CreateSiswaData as CreateSiswaPayload, UpdateSiswaData as UpdateSiswaPayload };

// ── Query Key Factory ──────────────────────────────────────────────────────
export const siswaQueryKeys = {
  all: ['siswa'] as const,
  lists: () => [...siswaQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...siswaQueryKeys.lists(), filters] as const,
  detail: (id: string) => [...siswaQueryKeys.all, 'detail', id] as const,
};


// Define local types if missing in academic.ts
export interface SiswaResponse {
  success: boolean;
  data: Siswa;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SiswaHistory {
  id: string;
  status: string;
  tahunPelajaran?: {
    id: string;
    tahun: string;
  };
  semester?: {
    id: string;
    nama_semester: string;
  };
  kelas?: {
    id: string;
    nama_kelas: string;
  };
  updatedAt?: string;
}

export const getSiswaList = async (
  page = 1, 
  limit = 10, 
  search = '', 
  kelas_id = '', 
  status = '', 
  gender = '',
  user_id = '',
  tingkat = ''
): Promise<PaginatedResponse<Siswa>> => {
  const params: any = { page, limit };
  if (search) params.search = search;
  if (kelas_id) params.kelas_id = kelas_id;
  if (status) params.status = status;
  if (gender) params.gender = gender;
  if (user_id) params.user_id = user_id;
  if (tingkat) params.tingkat = tingkat;

  return requestWithFallback<PaginatedResponse<Siswa>>('get', '/academic/siswa', { params });
};

export const getSiswaById = async (id: string): Promise<Siswa | null> => {
  const res = await requestWithFallback<{ success: boolean; data: Siswa }>('get', `/academic/siswa/${id}`);
  return res.data || null;
};

// Alias for backward compatibility
export const getSiswaDetail = getSiswaById;

export const createSiswa = async (data: Partial<Siswa>): Promise<{ success: boolean; message: string; data?: Siswa }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: Siswa }>('post', '/academic/siswa', { data });
};

export const updateSiswa = async (id: string, data: Partial<Siswa>): Promise<{ success: boolean; message: string; data?: Siswa }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: Siswa }>('put', `/academic/siswa/${id}`, { data });
};

export const deleteSiswa = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/siswa/${id}`);
};

export const getSiswaHistory = async (id: string): Promise<SiswaHistory[]> => {
  const res = await requestWithFallback<{ success: boolean; data: SiswaHistory[] }>('get', `/academic/siswa/${id}/history`);
  return res.data || [];
};

export const sendParentAccess = async (id: string): Promise<{ success: boolean; message: string; data?: any }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: any }>('post', `/academic/siswa/${id}/send-access`);
};

// Overload to support both signatures
export function bulkUpdateStatus(ids: string[], status: string, tanggal: Date, alasan?: string): Promise<{ success: boolean; message: string }>;
export function bulkUpdateStatus(payload: { siswaIds?: string[]; ids?: string[]; status: string; tanggal: Date; alasan?: string; keterangan?: string }): Promise<{ success: boolean; message: string }>;
export function bulkUpdateStatus(
  idsOrPayload: string[] | { siswaIds?: string[]; ids?: string[]; status: string; tanggal: Date; alasan?: string; keterangan?: string },
  status?: string,
  tanggal?: Date,
  alasan?: string
): Promise<{ success: boolean; message: string }> {
  let data: any;
  if (Array.isArray(idsOrPayload)) {
    data = { siswaIds: idsOrPayload, status, tanggal, alasan };
  } else {
    // Normalize: support both 'ids'/'siswaIds' and 'keterangan'/'alasan'
    data = {
      siswaIds: idsOrPayload.siswaIds || idsOrPayload.ids,
      status: idsOrPayload.status,
      tanggal: idsOrPayload.tanggal,
      alasan: idsOrPayload.alasan || (idsOrPayload as any).keterangan,
    };
  }
  
  return requestWithFallback<{ success: boolean; message: string }>('post', '/academic/siswa/bulk-status', { 
    data
  });
}


export const generateRfid = async (id: string): Promise<{ success: boolean; message: string; data?: any }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: any }>('post', `/academic/siswa/${id}/rfid/generate`);
};

export const generateRfidBulk = async (ids: string[]): Promise<{ success: boolean; message: string; data?: any }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: any }>('post', `/academic/siswa/rfid/generate-bulk`, { data: { ids } });
};

// Create missing SiswaAkademik snapshots for active year/semester
export const syncSiswaAkademik = async (kelas_id?: string): Promise<{ success: boolean; message: string; data?: any }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: any }>('post', '/academic/siswa/akademik/sync', { data: { kelas_id } });
};

export const checkAcademicStatus = async (ids: string[], yearId?: string, semesterId?: string): Promise<Record<string, string | null>> => {
  const res = await requestWithFallback<{ success: boolean; data: Record<string, string | null> }>('post', '/academic/siswa/akademik/check-status', { data: { ids, year_id: yearId, semester_id: semesterId } });
  return res.data || {};
};

export const getAcademicRegistrationStats = async (yearId: string, semesterId: string): Promise<{ registered: number; total_active: number } | null> => {
  const res = await requestWithFallback<{ success: boolean; data: { registered: number; total_active: number } }>('get', '/academic/siswa/akademik/stats', { params: { year_id: yearId, semester_id: semesterId } });
  return res.data || null;
};

export const downloadSiswaImportTemplate = async (): Promise<Blob> => {
  return downloadBlob('/academic/siswa/import/template');
};

import { importDataFromExcel } from '../../utils/import.utils';

export const importSiswaFromExcel = async (
  file: File,
  onProgress?: (percent: number) => void,
  socketId?: string,
  extraParams?: Record<string, string>
) => {
  return importDataFromExcel('/academic/siswa/import', file, onProgress, socketId, extraParams);
};

export const deleteAllSiswa = async (): Promise<{ success: boolean; message: string; data?: any }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: any }>('delete', '/academic/siswa/all');
};

export const exportSiswaToExcel = async (): Promise<Blob> => {
  return downloadBlob('/academic/siswa/export');
};

export const generateNisMassal = async (orderedKelasIds?: string[]): Promise<{
  success: boolean;
  message: string;
  data?: { generated: number; skipped: number; errors: { siswaId: string; nama: string; reason: string }[] };
}> => {
  return requestWithFallback('post', '/academic/siswa/nis/generate-massal', {
    ordered_kelas_ids: orderedKelasIds ?? []
  });
};

export interface NisWizardKelas {
  kelasId: string;
  namaKelas: string;
  tingkat: number;
  jurusanId: string | null;
  namaJurusan: string;
  jumlahSiswa: number;
}

export const getNisWizardPreview = async (): Promise<{
  success: boolean;
  data?: NisWizardKelas[];
}> => {
  return requestWithFallback('get', '/academic/siswa/nis/wizard-preview');
};

export interface SiswaTimelineItem {
  id: string;
  tanggal: string;
  tipe: 'STATUS_AKADEMIK' | 'PELANGGARAN' | 'DOKUMEN' | 'PEMANGGILAN' | 'HOME_VISIT' | 'ASESMEN' | 'KONSELING' | 'RUJUKAN' | string;
  judul: string;
  keterangan: string;
  poin?: number;
  status?: string;
  file_name?: string;
  file_url?: string;
  document_id?: string;
  kategori_dokumen?: string;
  size_bytes?: number;
  user_name: string;
}

export const getSiswaTimeline = async (id: string): Promise<SiswaTimelineItem[]> => {
  const res = await requestWithFallback<{ success: boolean; data: SiswaTimelineItem[] }>('get', `/academic/siswa/${id}/timeline`);
  return res.data || [];
};

export const uploadSiswaDocument = async (
  id: string,
  file: File,
  judul: string,
  kategori: string
): Promise<{ success: boolean; message: string }> => {
  const formData = new FormData();
  formData.append('judul', judul);
  formData.append('kategori', kategori);
  formData.append('file', file);

  return requestWithFallback<{ success: boolean; message: string }>('post', `/academic/siswa/${id}/documents`, {
    data: formData
  });
};

export const deleteSiswaDocument = async (id: string, docId: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/siswa/${id}/documents/${docId}`);
};

export const completeSiswaExit = async (
  id: string,
  file: File,
  status: string,
  alasan?: string
): Promise<{ success: boolean; message: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('status', status);
  if (alasan) {
    formData.append('alasan', alasan);
  }

  return requestWithFallback<{ success: boolean; message: string }>('post', `/academic/siswa/${id}/complete-exit`, {
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const downloadSiswaDocumentFile = async (id: string, docId: string): Promise<Blob> => {
  return downloadBlob(`/academic/siswa/${id}/documents/${docId}/download`);
};

export const downloadSiswaExitBundle = async (id: string): Promise<Blob> => {
  return downloadBlob(`/academic/siswa/${id}/exit-bundle`);
};

export const mapPpdbStudents = async (
  siswa_ids: string[],
  target_kelas_id: string
): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('post', '/academic/siswa/ppdb/map', {
    data: { siswa_ids, target_kelas_id }
  });
};

export const normalizeSiswaWaPhones = async (): Promise<{
  success: boolean;
  message: string;
  data: { total: number; updated: number; unchanged: number; invalid: number };
}> => {
  return requestWithFallback('post', '/academic/siswa/normalize-wa-phones');
};
