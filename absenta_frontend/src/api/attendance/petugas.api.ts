import { requestWithFallback } from "../apiUtils";
import type { Siswa } from "../../types/academic";

export interface PetugasResponse {
  id: string;
  user_id?: string;
  siswa_id?: string;
  struktur_organisasi_id?: string;
  position_id?: string;
  kelas_id?: string;
  custom_title?: string | null;
  is_leader?: boolean;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  Siswa?: Siswa | null;
  user_email?: string;
  user_full_name?: string;
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
  custom_title?: string;
  is_leader?: boolean;
}

export const getPetugasList = async (
  page = 1,
  limit = 10,
  search = "",
  kelasId = ""
): Promise<PaginatedPetugasResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (kelasId) params.set("kelas_id", kelasId);
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
