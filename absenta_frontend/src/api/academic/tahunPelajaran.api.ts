import { requestWithFallback } from "../apiUtils";
import type { TahunPelajaran, CreateTahunPelajaranData, UpdateTahunPelajaranData } from "../../types/academic";

// Standard Query Keys Factory
export const academicQueryKeys = {
  tahunPelajaran: {
    all: ['tahunPelajarans'] as const,
    lists: () => [...academicQueryKeys.tahunPelajaran.all, 'list'] as const,
    list: (filters: any) => [...academicQueryKeys.tahunPelajaran.lists(), filters] as const,
    details: () => [...academicQueryKeys.tahunPelajaran.all, 'detail'] as const,
    detail: (id: string) => [...academicQueryKeys.tahunPelajaran.details(), id] as const,
    active: ['activeAcademicYear'] as const,
  },
  stats: ['academicStats'] as const,
};

export interface PaginatedTahunPelajaranResponse {
  success: boolean;
  message: string;
  data: TahunPelajaran[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleTahunPelajaranResponse {
  success: boolean;
  message: string;
  data: TahunPelajaran;
}

export interface CreateTahunPelajaranPayload {
  tahun: string;
  is_active?: boolean;
}

export interface UpdateTahunPelajaranPayload {
  tahun?: string;
  is_active?: boolean;
}

// Get Tahun Pelajaran List - GET /api/academic/tahun-pelajaran
export const getTahunPelajaranList = async (
  page = 1, 
  limit = 10, 
  search = "",
  status = ""
): Promise<PaginatedTahunPelajaranResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search
  });
  if (status && status !== 'ALL') params.append('status', status);

  return requestWithFallback<PaginatedTahunPelajaranResponse>('get', `/academic/tahun-pelajaran?${params.toString()}`);
};

// Get Tahun Pelajaran Detail - GET /api/academic/tahun-pelajaran/:id
export const getTahunPelajaranDetail = async (id: string): Promise<TahunPelajaran> => {
  const res = await requestWithFallback<SingleTahunPelajaranResponse>('get', `/academic/tahun-pelajaran/${id}`);
  return res.data;
};

// Get Active Tahun Pelajaran - GET /api/academic/tahun-pelajaran/active
export const getActiveTahunPelajaran = async (): Promise<TahunPelajaran | null> => {
  const res = await requestWithFallback<SingleTahunPelajaranResponse>('get', `/academic/tahun-pelajaran/active`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
  return res.data;
};

// Create Tahun Pelajaran - POST /api/academic/tahun-pelajaran
export const createTahunPelajaran = async (payload: CreateTahunPelajaranPayload): Promise<SingleTahunPelajaranResponse> => {
  return requestWithFallback<SingleTahunPelajaranResponse>('post', `/academic/tahun-pelajaran`, { data: payload });
};

// Update Tahun Pelajaran - PUT /api/academic/tahun-pelajaran/:id
export const updateTahunPelajaran = async (id: string, payload: UpdateTahunPelajaranPayload): Promise<SingleTahunPelajaranResponse> => {
  return requestWithFallback<SingleTahunPelajaranResponse>('put', `/academic/tahun-pelajaran/${id}`, { data: payload });
};

// Activate Tahun Pelajaran - PUT /api/academic/tahun-pelajaran/:id/activate
export const activateTahunPelajaran = async (id: string): Promise<SingleTahunPelajaranResponse> => {
  return requestWithFallback<SingleTahunPelajaranResponse>('put', `/academic/tahun-pelajaran/${id}/activate`);
};

// Delete Tahun Pelajaran - DELETE /api/academic/tahun-pelajaran/:id
export const deleteTahunPelajaran = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/tahun-pelajaran/${id}`);
};
