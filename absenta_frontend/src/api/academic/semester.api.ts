import { requestWithFallback } from "../apiUtils";
import type { Semester } from "../../types/academic";

export interface PaginatedSemesterResponse {
  success: boolean;
  message: string;
  data: Semester[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleSemesterResponse {
  success: boolean;
  message: string;
  data: Semester;
}

export interface CreateSemesterPayload {
  nama_semester: string;
  tahun_pelajaran_id: string;
  is_active?: boolean;
}

export interface UpdateSemesterPayload {
  nama_semester?: string;
  tahun_pelajaran_id?: string;
  is_active?: boolean;
}

export interface SetActiveSemesterResponse {
  success: boolean;
  message: string;
  data: {
    activated_semester: Semester;
    deactivated_semesters: Semester[];
  };
}

export const semesterQueryKeys = {
  all: ['semesters'] as const,
  list: (params: { page?: number; limit?: number; search?: string; tahunPelajaranId?: string }) =>
    ['semesters', 'list', params] as const,
  active: ['semesters', 'active'] as const,
  detail: (id: string) => ['semesters', 'detail', id] as const,
};

// Get Semester List - GET /api/academic/semester
export const getSemesterList = async (
  page = 1, 
  limit = 10, 
  search = "",
  tahun_pelajaran_id?: string
): Promise<PaginatedSemesterResponse> => {
  let url = `/academic/semester?page=${page}&limit=${limit}&search=${search}`;
  if (tahun_pelajaran_id) {
    url += `&tahun_pelajaran_id=${tahun_pelajaran_id}`;
  }
  return requestWithFallback<PaginatedSemesterResponse>('get', url);
};

// Get Semester Detail - GET /api/academic/semester/:id
export const getSemesterDetail = async (id: string): Promise<Semester> => {
  const res = await requestWithFallback<SingleSemesterResponse>('get', `/academic/semester/${id}`);
  return res.data;
};

// Create Semester - POST /api/academic/semester
export const createSemester = async (payload: CreateSemesterPayload): Promise<SingleSemesterResponse> => {
  return requestWithFallback<SingleSemesterResponse>('post', "/academic/semester", { data: payload });
};

// Update Semester - PUT /api/academic/semester/:id
export const updateSemester = async (
  id: string, 
  payload: UpdateSemesterPayload
): Promise<SingleSemesterResponse> => {
  return requestWithFallback<SingleSemesterResponse>('put', `/academic/semester/${id}`, { data: payload });
};

// Delete Semester - DELETE /api/academic/semester/:id
export const deleteSemester = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/semester/${id}`);
};

// Set Active Semester - PUT /api/academic/semester/:id/activate
export const setActiveSemester = async (id: string): Promise<SetActiveSemesterResponse> => {
  return requestWithFallback<SetActiveSemesterResponse>('put', `/academic/semester/${id}/activate`);
};

// Get Active Semester - GET /api/academic/semester/active
export const getActiveSemester = async (): Promise<SingleSemesterResponse> => {
  return requestWithFallback<SingleSemesterResponse>('get', "/academic/semester/active");
};

// Get Semesters by Tahun Pelajaran - GET /api/academic/semester/tahun-pelajaran/:tahun_pelajaran_id
export const getSemestersByTahunPelajaran = async (tahun_pelajaran_id: string): Promise<PaginatedSemesterResponse> => {
  return requestWithFallback<PaginatedSemesterResponse>('get', `/academic/semester/tahun-pelajaran/${tahun_pelajaran_id}`);
};
