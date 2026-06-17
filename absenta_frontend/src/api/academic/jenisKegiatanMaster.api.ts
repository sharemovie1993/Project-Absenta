import { requestWithFallback } from "../apiUtils";

export interface JenisKegiatanMaster {
  id: string;
  tenant_id: string;
  nama: string;
  tipe: string;
  urutan?: number;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreateJKMPayload {
  nama: string;
  tipe: string;
  urutan?: number;
  aktif?: boolean;
}

export interface UpdateJKMPayload {
  nama?: string;
  tipe?: string;
  urutan?: number;
  aktif?: boolean;
}

export const jenisKegiatanMasterApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<JenisKegiatanMaster>> => {
    return requestWithFallback<PaginatedResponse<JenisKegiatanMaster>>(
      'get',
      '/academic/jenis-kegiatan-master',
      {
        params,
        headers: { 'X-Skip-403-Redirect': 'true' }
      }
    );
  },
  getById: async (id: string): Promise<SingleResponse<JenisKegiatanMaster>> => {
    return requestWithFallback<SingleResponse<JenisKegiatanMaster>>('get', `/academic/jenis-kegiatan-master/${id}`);
  },
  create: async (payload: CreateJKMPayload): Promise<SingleResponse<JenisKegiatanMaster>> => {
    return requestWithFallback<SingleResponse<JenisKegiatanMaster>>('post', '/academic/jenis-kegiatan-master', { data: payload });
  },
  update: async (id: string, payload: UpdateJKMPayload): Promise<SingleResponse<JenisKegiatanMaster>> => {
    return requestWithFallback<SingleResponse<JenisKegiatanMaster>>('put', `/academic/jenis-kegiatan-master/${id}`, { data: payload });
  },
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/jenis-kegiatan-master/${id}`);
  }
};

