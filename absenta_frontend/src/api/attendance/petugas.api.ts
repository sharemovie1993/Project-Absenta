import { requestWithFallback } from "../apiUtils";
import type { Siswa } from "../../types/academic";

export interface PetugasResponse {
  id: string;
  siswa_id: string;
  struktur_organisasi_id: string;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  Siswa: Siswa;
}

export interface PaginatedPetugasResponse {
  success: boolean;
  message: string;
  data: PetugasResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AssignPetugasPayload {
  siswa_id: string;
  kelas_id: string;
}

export const getPetugasList = async (
  page = 1,
  limit = 10,
  search = ""
): Promise<PaginatedPetugasResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  return requestWithFallback<PaginatedPetugasResponse>('get', `/attendance/petugas?${params.toString()}`);
};

export const assignPetugas = async (
  payload: AssignPetugasPayload
): Promise<{ success: boolean; message: string; data: PetugasResponse }> => {
  return requestWithFallback<{ success: boolean; message: string; data: PetugasResponse }>('post', `/attendance/petugas`, { data: payload });
};

export const unassignPetugas = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/attendance/petugas/${id}`);
};
