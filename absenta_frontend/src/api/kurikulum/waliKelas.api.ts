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

// ── Jurnal Wali Kelas ──
export const getJurnalWaliKelasList = async (
  page = 1,
  limit = 20,
  search = '',
  kelas_id?: string
) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  if (kelas_id) params.set('kelas_id', kelas_id);
  return requestWithFallback<any>('get', `/kurikulum/wali-kelas/jurnal?${params.toString()}`);
};

export const createJurnalWaliKelas = async (payload: {
  tanggal: string;
  kategori: string;
  judul: string;
  isi: string;
  kelas_id?: string;
  tags?: string[];
  attached_students?: string[];
}) => {
  return requestWithFallback<any>('post', `/kurikulum/wali-kelas/jurnal`, { data: payload });
};

export const deleteJurnalWaliKelas = async (id: string) => {
  return requestWithFallback<any>('delete', `/kurikulum/wali-kelas/jurnal/${id}`);
};

// ── Permohonan Izin Siswa ──
export const getPermohonanIzinList = async (
  status?: string,
  kelas_id?: string,
  search = '',
  limit = 100
) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set('status', status);
  if (kelas_id) params.set('kelas_id', kelas_id);
  if (search) params.set('search', search);
  return requestWithFallback<any>('get', `/kurikulum/wali-kelas/permohonan-izin?${params.toString()}`);
};

export const createPermohonanIzin = async (payload: any) => {
  return requestWithFallback<any>('post', `/kurikulum/wali-kelas/permohonan-izin`, { data: payload });
};

export const updatePermohonanIzinStatus = async (id: string, payload: { status: string; catatan_penolakan?: string }) => {
  return requestWithFallback<any>('patch', `/kurikulum/wali-kelas/permohonan-izin/${id}/status`, { data: payload });
};

// ── EWS Per Kelas ──
export const getEwsPerKelasList = async (kelas_id?: string, limit = 100) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (kelas_id) params.set('kelas_id', kelas_id);
  return requestWithFallback<any>('get', `/kurikulum/wali-kelas/ews?${params.toString()}`);
};

// ── Pelanggaran Siswa ──
export const getPelanggaranList = async (kelas_id?: string, limit = 100) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (kelas_id) params.set('kelas_id', kelas_id);
  return requestWithFallback<any>('get', `/kesiswaan/pelanggaran?${params.toString()}`);
};

// ── Prestasi Siswa ──
export const getPrestasiList = async (kelas_id?: string, limit = 100) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (kelas_id) params.set('kelas_id', kelas_id);
  return requestWithFallback<any>('get', `/kesiswaan/prestasi/prestasi?${params.toString()}`);
};

// ── Siswa & Presensi Matrix Rombel ──
export const getSiswaWalasList = async (kelas_id?: string, limit = 100, status = 'AKTIF') => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (kelas_id) params.set('kelas_id', kelas_id);
  if (status) params.set('status', status);
  return requestWithFallback<any>('get', `/academic/siswa?${params.toString()}`);
};




