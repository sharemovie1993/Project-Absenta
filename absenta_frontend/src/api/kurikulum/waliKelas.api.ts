import { requestWithFallback } from "../apiUtils";
import type { WaliKelas, WaliKelasStrukturAssignment } from "../../types/academic";



export interface PaginatedWaliKelasStrukturResponse {
  success: boolean;
  message: string;
  data: WaliKelasStrukturAssignment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}



export interface SingleWaliKelasStrukturResponse {
  success: boolean;
  message: string;
  data: WaliKelasStrukturAssignment;
}



export interface AssignWaliKelasStrukturPayload {
  guru_id: string;
  kelas_id: string;
}



export const getWaliKelasStrukturList = async (
  page = 1,
  limit = 10,
  search = "",
  filters?: { guru_id?: string; kelas_id?: string; include_inactive?: boolean }
): Promise<PaginatedWaliKelasStrukturResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (filters?.guru_id) params.set("guru_id", filters.guru_id);
  if (filters?.kelas_id) params.set("kelas_id", filters.kelas_id);
  if (filters?.include_inactive) params.set("include_inactive", "true");
  return requestWithFallback<PaginatedWaliKelasStrukturResponse>('get', `/kurikulum/wali-kelas/struktur?${params.toString()}`);
};



export const assignWaliKelasStruktur = async (
  payload: AssignWaliKelasStrukturPayload
): Promise<SingleWaliKelasStrukturResponse> => {
  return requestWithFallback<SingleWaliKelasStrukturResponse>('post', `/kurikulum/wali-kelas/struktur/assign`, { data: payload });
};

export const nonaktifWaliKelasStruktur = async (
  id: string
): Promise<{ success: boolean; message: string; data: null }> => {
  return requestWithFallback<{ success: boolean; message: string; data: null }>('put', `/kurikulum/wali-kelas/struktur/${id}/nonaktif`);
};



