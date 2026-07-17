import { requestWithFallback } from "../apiUtils";
import { importDataFromExcel } from "../../utils/import.utils";
import type { GuruMapel } from "../../types/academic";

export interface ListGuruMapelResponse {
  success: boolean;
  message: string;
  data: GuruMapel[];
}

export interface SingleGuruMapelResponse {
  success: boolean;
  message: string;
  data: GuruMapel;
}

export interface CreateGuruMapelPayload {
  guru_id: string;
  mapel_id: string;
}

// GET /api/kurikulum/guru-mapel
export const listGuruMapel = async (
  filters?: { guru_id?: string; mapel_id?: string }
): Promise<ListGuruMapelResponse> => {
  const params = new URLSearchParams();
  if (filters?.guru_id) params.append('guru_id', filters.guru_id);
  if (filters?.mapel_id) params.append('mapel_id', filters.mapel_id);

  const url = `/kurikulum/guru-mapel${params.toString() ? `?${params.toString()}` : ''}`;
  return requestWithFallback<ListGuruMapelResponse>('get', url);
};

// POST /api/kurikulum/guru-mapel
export const assignGuruMapel = async (
  payload: CreateGuruMapelPayload
): Promise<SingleGuruMapelResponse> => {
  return requestWithFallback<SingleGuruMapelResponse>('post', '/kurikulum/guru-mapel', { data: payload });
};

// DELETE /api/kurikulum/guru-mapel/:id
export const removeGuruMapel = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/kurikulum/guru-mapel/${id}`);
};

// POST /api/kurikulum/guru-mapel/import
export const importGuruMapelFromExcel = async (
  file: File,
  onProgress?: (progress: number) => void
) => {
  return importDataFromExcel('/kurikulum/guru-mapel/import', file, onProgress);
};
