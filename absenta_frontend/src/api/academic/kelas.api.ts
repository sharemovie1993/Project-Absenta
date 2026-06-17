import { requestWithFallback, downloadBlob } from '../apiUtils';
import { importDataFromExcel } from '../../utils/import.utils';
import type { Kelas } from "../../types/academic";

export interface PaginatedKelasResponse {
  success: boolean;
  message: string;
  data: Kelas[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleKelasResponse {
  success: boolean;
  message: string;
  data: Kelas;
}

export interface CreateKelasPayload {
  nama_kelas: string;
  tingkat: number;
  jurusan_id: string;
  guru_id?: string; // Optional for wali kelas assignment
  jam_masuk?: string;
  jam_pulang?: string;
  device_id?: string;
  is_active?: boolean;
}


export interface UpdateKelasPayload {
  nama_kelas?: string;
  tingkat?: number;
  jurusan_id?: string;
  guru_id?: string; // Optional for wali kelas assignment
  jam_masuk?: string;
  jam_pulang?: string;
  device_id?: string;
  is_active?: boolean;
}


// Get Kelas List - GET /api/academic/kelas
export const getKelasList = async (
  page = 1, 
  limit = 10, 
  search = "",
  tingkat = "",
  jurusan_id = "",
  guru_id = "",
  is_active = ""
): Promise<PaginatedKelasResponse> => {
  return requestWithFallback<PaginatedKelasResponse>(
    'get',
    `/academic/kelas?page=${page}&limit=${limit}&search=${search}&tingkat=${tingkat}&jurusan_id=${jurusan_id}&guru_id=${guru_id}&is_active=${is_active}`,
    {
      headers: { 'X-Skip-403-Redirect': 'true' }
    }
  );
};

// Get Kelas Detail - GET /api/academic/kelas/:id
export const getKelasDetail = async (id: string): Promise<Kelas> => {
  const res = await requestWithFallback<SingleKelasResponse>('get', `/academic/kelas/${id}`);
  return res.data;
};

// Create Kelas - POST /api/academic/kelas
export const createKelas = async (payload: CreateKelasPayload): Promise<SingleKelasResponse> => {
  return requestWithFallback<SingleKelasResponse>('post', "/academic/kelas", { data: payload });
};

// Update Kelas - PUT /api/academic/kelas/:id
export const updateKelas = async (
  id: string, 
  payload: UpdateKelasPayload
): Promise<SingleKelasResponse> => {
  return requestWithFallback<SingleKelasResponse>('put', `/academic/kelas/${id}`, { data: payload });
};

// Delete Kelas - DELETE /api/academic/kelas/:id
export const deleteKelas = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/kelas/${id}`);
};

// Import Kelas from Excel - POST /api/academic/kelas/import
export const importKelasFromExcel = async (
  file: File, 
  onUploadProgress?: (progress: number) => void
) => {
  return importDataFromExcel('/academic/kelas/import', file, onUploadProgress);
};

// Download Import Template - GET /api/academic/kelas/import/template
export const downloadKelasImportTemplate = async (): Promise<Blob> => {
  return downloadBlob('/academic/kelas/import/template');
};

// Export Kelas to Excel - GET /api/academic/kelas/export
export const exportKelasToExcel = async (): Promise<Blob> => {
  return downloadBlob('/academic/kelas/export');
};
