import { requestWithFallback, downloadBlob } from "../apiUtils";
import { importDataFromExcel } from "../../utils/import.utils";
import type { Jurusan, CreateJurusanData, UpdateJurusanData } from "../../types/academic";

export interface PaginatedJurusanResponse {
  success: boolean;
  message: string;
  data: Jurusan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleJurusanResponse {
  success: boolean;
  message: string;
  data: Jurusan;
}

export interface CreateJurusanPayload {
  nama: string;
  kode?: string;
  singkatan?: string;
  warna?: string | null;
  program_keahlian_id?: string | null;
  durasi_jurusan?: string | null;
}

export interface UpdateJurusanPayload {
  nama?: string;
  kode?: string;
  singkatan?: string;
  warna?: string | null;
  program_keahlian_id?: string | null;
  durasi_jurusan?: string | null;
}

export const jurusanQueryKeys = {
  all: ['jurusan'] as const,
  list: (params: { page?: number; limit?: number; search?: string }) =>
    ['jurusan', 'list', params] as const,
  options: ['jurusan-options-list'] as const,
  detail: (id: string) => ['jurusan', 'detail', id] as const,
};

// Get Jurusan List - GET /api/academic/jurusan
export const getJurusanList = async (
  page = 1, 
  limit = 10, 
  search = ""
): Promise<PaginatedJurusanResponse> => {
  return requestWithFallback<PaginatedJurusanResponse>(
    'get',
    `/academic/jurusan?page=${page}&limit=${limit}&search=${search}`,
    {
      headers: { 'X-Skip-403-Redirect': 'true' }
    }
  );
};

// Get Jurusan Detail - GET /api/academic/jurusan/:id
export const getJurusanDetail = async (id: string): Promise<Jurusan> => {
  const res = await requestWithFallback<SingleJurusanResponse>('get', `/academic/jurusan/${id}`);
  return res.data;
};

// Create Jurusan - POST /api/academic/jurusan
export const createJurusan = async (payload: CreateJurusanPayload): Promise<SingleJurusanResponse> => {
  return requestWithFallback<SingleJurusanResponse>('post', "/academic/jurusan", { data: payload });
};

// Update Jurusan - PUT /api/academic/jurusan/:id
export const updateJurusan = async (
  id: string, 
  payload: UpdateJurusanPayload
): Promise<SingleJurusanResponse> => {
  return requestWithFallback<SingleJurusanResponse>('put', `/academic/jurusan/${id}`, { data: payload });
};

// Delete Jurusan - DELETE /api/academic/jurusan/:id
export const deleteJurusan = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/jurusan/${id}`);
};

// Download Import Template
export const downloadJurusanImportTemplate = async (): Promise<Blob> => {
  return downloadBlob('/academic/jurusan/import/template');
};

// Import Jurusan from Excel
export const importJurusanFromExcel = async (
  file: File,
  onUploadProgress?: (progress: number) => void
) => {
  return importDataFromExcel('/academic/jurusan/import', file, onUploadProgress);
};

// Export Jurusan to Excel
export const exportJurusanToExcel = async (): Promise<Blob> => {
  return downloadBlob('/academic/jurusan/export');
};

// Bulk Create Program & Jurusan via Wizard
export const bulkWizardCreateJurusan = async (payload: {
  programs: Array<{ nama: string; kode: string; singkatan: string; bidang_keahlian?: string }>;
  jurusans: Array<{ nama: string; kode: string; singkatan: string; program_keahlian_kode: string }>;
}): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('post', '/academic/jurusan/bulk-wizard', { data: payload });
};
