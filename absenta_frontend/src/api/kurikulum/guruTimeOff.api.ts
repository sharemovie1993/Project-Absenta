import { requestWithFallback } from "../apiUtils";

export interface GuruTimeOffItem {
  id: string;
  tenant_id: string;
  guru_id: string;
  hari: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU';
  slot_index: number | null; // null = full day
  keterangan?: string | null;
  created_at?: string;
}

export interface SaveTimeOffPayload {
  guru_id: string;
  time_offs: {
    hari: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU';
    slot_index: number | null;
    keterangan?: string;
  }[];
}

export const getTimeOffByGuru = async (guruId: string) => {
  return requestWithFallback<{ success: boolean; data: GuruTimeOffItem[] }>(
    'get',
    `/kurikulum/guru-time-off/by-guru?guru_id=${guruId}`
  );
};

export const getAllTenantTimeOffs = async () => {
  return requestWithFallback<{ success: boolean; data: any[] }>(
    'get',
    '/kurikulum/guru-time-off/all'
  );
};

export const saveGuruTimeOffs = async (payload: SaveTimeOffPayload) => {
  return requestWithFallback<{ success: boolean; data: GuruTimeOffItem[] }>(
    'post',
    '/kurikulum/guru-time-off/save',
    { data: payload }
  );
};

export const deleteTimeOff = async (id: string) => {
  return requestWithFallback<{ success: boolean }>(
    'delete',
    `/kurikulum/guru-time-off/${id}`
  );
};
