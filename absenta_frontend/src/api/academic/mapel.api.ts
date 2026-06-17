import { requestWithFallback, downloadBlob } from "../apiUtils";
import { importDataFromExcel } from "../../utils/import.utils";
import type { Mapel } from "../../types/academic";

// Re-export Mapel type for external use
export type { Mapel };

export interface PaginatedMapelResponse {
  success: boolean;
  message: string;
  data: Mapel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleMapelResponse {
  success: boolean;
  message: string;
  data: Mapel;
}

export interface CreateMapelPayload {
  nama_mapel: string;
  kode_mapel?: string;
  tingkat?: number;
}

export interface UpdateMapelPayload {
  nama_mapel?: string;
  kode_mapel?: string;
  tingkat?: number;
}

// Get Mapel List - GET /api/academic/mapel
export const getMapelList = async (
  page = 1, 
  limit = 10, 
  search = "",
  tingkat = ""
): Promise<PaginatedMapelResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search
  });
  if (tingkat && tingkat !== 'ALL') params.append('tingkat', tingkat);

  return requestWithFallback<PaginatedMapelResponse>('get', `/academic/mapel?${params.toString()}`);
};

// Get Mapel Detail - GET /api/academic/mapel/:id
export const getMapelDetail = async (id: string): Promise<SingleMapelResponse> => {
  return requestWithFallback<SingleMapelResponse>('get', `/academic/mapel/${id}`);
};

// Get Mapel by Tingkat - GET /api/academic/mapel/tingkat/:tingkat
export const getMapelByTingkat = async (tingkat: number): Promise<PaginatedMapelResponse> => {
  return requestWithFallback<PaginatedMapelResponse>('get', `/academic/mapel/tingkat/${tingkat}`);
};

// Create Mapel - POST /api/academic/mapel
export const createMapel = async (payload: CreateMapelPayload): Promise<SingleMapelResponse> => {
  return requestWithFallback<SingleMapelResponse>('post', "/academic/mapel", { data: payload });
};

// Update Mapel - PUT /api/academic/mapel/:id
export const updateMapel = async (
  id: string, 
  payload: UpdateMapelPayload
): Promise<SingleMapelResponse> => {
  return requestWithFallback<SingleMapelResponse>('put', `/academic/mapel/${id}`, { data: payload });
};

// Delete Mapel - DELETE /api/academic/mapel/:id
export const deleteMapel = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/mapel/${id}`);
};

// Download Import Template
export const downloadMapelImportTemplate = async (): Promise<Blob> => {
  return downloadBlob('/academic/mapel/import/template');
};

// Import Mapel from Excel
export const importMapelFromExcel = async (
  file: File,
  onUploadProgress?: (progress: number) => void
) => {
  return importDataFromExcel('/academic/mapel/import', file, onUploadProgress);
};

// Export Mapel to Excel
export const exportMapelToExcel = async (): Promise<Blob> => {
  return downloadBlob('/academic/mapel/export');
};
