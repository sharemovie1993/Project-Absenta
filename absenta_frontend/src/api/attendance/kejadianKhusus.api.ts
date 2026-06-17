import { requestWithFallback } from "../apiUtils";

export interface KejadianKhusus {
  id: string;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  abaikan_terlambat: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateKejadianKhususPayload {
  tanggal: string;
  keterangan: string;
  abaikan_terlambat: boolean;
}

export const getKejadianKhususList = async () => {
  return requestWithFallback<{ success: boolean; data: KejadianKhusus[] }>(
    'get',
    '/attendance/kejadian-khusus'
  );
};

export const createKejadianKhusus = async (payload: CreateKejadianKhususPayload) => {
  return requestWithFallback<{ success: boolean; data: KejadianKhusus }>(
    'post',
    '/attendance/kejadian-khusus',
    { data: payload }
  );
};

export const deleteKejadianKhusus = async (id: string) => {
  return requestWithFallback<{ success: boolean; message: string }>(
    'delete',
    `/attendance/kejadian-khusus/${id}`
  );
};
