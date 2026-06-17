import { requestWithFallback } from '../apiUtils';
import type { Guru, Siswa } from '../../types/academic';

export interface StrukturOrganisasi {
  id: string;
  tenant_id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  scope: string;
  scope_type?: string | null;
  unit_id?: string | null;
  kelas_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    organizationalAssigns: number;
    organizationalCaps: number;
  };
  organizationalAssigns?: OrganizationalAssignment[];
  
  // Backward compatibility aliases if needed
  GuruStrukturOrganisasi?: GuruStrukturOrganisasi[];
  SiswaStrukturOrganisasi?: SiswaStrukturOrganisasi[];
  tingkat?: number | null;
  kelas_name?: string | null;
  unit_name?: string | null;
  members?: any[];
}

export interface OrganizationalAssignment {
  id: string;
  position_id: string;
  user_id: string;
  is_active: boolean;
  unit_id?: string | null;
  kelas_id?: string | null;
  start_date?: string;
  end_date?: string;
  User?: {
    id: string;
    Guru?: Guru;
    Siswa?: Siswa;
  };
}

export type GuruStrukturOrganisasi = OrganizationalAssignment;
export type SiswaStrukturOrganisasi = OrganizationalAssignment;

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface StrukturPermissionItem {
  id: string;
  struktur_organisasi_id: string;
  permission_id: string;
  conditions?: unknown;
  permission?: {
    id: string;
    description?: string | null;
    group?: string | null;
    scope_template?: unknown;
  } | null;
}

export interface CreateStrukturInput {
  kode: string;
  nama: string;
  deskripsi?: string;
  scope: string;
  unit_id?: string | null;
  kelas_id?: string | null;
}

export interface UpdateStrukturInput {
  kode?: string;
  nama?: string;
  deskripsi?: string;
  scope?: string;
  is_active?: boolean;
}

export interface AssignGuruInput {
  guru_id: string;
  unit_id?: string | null;
  kelas_id?: string | null;
  start_date?: string;
  end_date?: string;
}

export interface AssignSiswaInput {
  siswa_id: string;
  unit_id?: string | null;
  kelas_id?: string | null;
  start_date?: string;
  end_date?: string;
}

// === API Methods ===

export const getStrukturList = async (params?: { is_active?: boolean; search?: string; tenant_id?: string }): Promise<ApiResponse<StrukturOrganisasi[]>> => {
  return requestWithFallback<ApiResponse<StrukturOrganisasi[]>>('get', '/academic/struktur-organisasi', { params });
};

export const getStrukturTree = async (): Promise<ApiResponse<Record<string, any[]>>> => {
  return requestWithFallback<ApiResponse<Record<string, any[]>>>('get', '/academic/struktur-organisasi/tree');
};

export const getStrukturDetail = async (id: string): Promise<ApiResponse<StrukturOrganisasi>> => {
  return requestWithFallback<ApiResponse<StrukturOrganisasi>>('get', `/academic/struktur-organisasi/${id}`);
};

export const createStruktur = async (data: CreateStrukturInput): Promise<ApiResponse<StrukturOrganisasi>> => {
  return requestWithFallback<ApiResponse<StrukturOrganisasi>>('post', '/academic/struktur-organisasi', { data });
};

export const updateStruktur = async (id: string, data: UpdateStrukturInput): Promise<ApiResponse<StrukturOrganisasi>> => {
  return requestWithFallback<ApiResponse<StrukturOrganisasi>>('put', `/academic/struktur-organisasi/${id}`, { data });
};

export const deleteStruktur = async (id: string): Promise<ApiResponse<null>> => {
  return requestWithFallback<ApiResponse<null>>('delete', `/academic/struktur-organisasi/${id}`);
};

export const assignGuruToStruktur = async (strukturId: string, data: AssignGuruInput): Promise<ApiResponse<GuruStrukturOrganisasi>> => {
  return requestWithFallback<ApiResponse<GuruStrukturOrganisasi>>('post', `/academic/struktur-organisasi/${strukturId}/guru`, { data });
};

export const removeGuruFromStruktur = async (strukturId: string, guruId: string): Promise<ApiResponse<null>> => {
  return requestWithFallback<ApiResponse<null>>('delete', `/academic/struktur-organisasi/${strukturId}/guru/${guruId}`);
};

export const assignSiswaToStruktur = async (strukturId: string, data: AssignSiswaInput): Promise<ApiResponse<SiswaStrukturOrganisasi>> => {
  return requestWithFallback<ApiResponse<SiswaStrukturOrganisasi>>('post', `/academic/struktur-organisasi/${strukturId}/siswa`, { data });
};

export const removeSiswaFromStruktur = async (strukturId: string, siswaId: string): Promise<ApiResponse<null>> => {
  return requestWithFallback<ApiResponse<null>>('delete', `/academic/struktur-organisasi/${strukturId}/siswa/${siswaId}`);
};

export const getStrukturPermissions = async (id: string, tenant_id?: string): Promise<ApiResponse<StrukturPermissionItem[]>> => {
  return requestWithFallback<ApiResponse<StrukturPermissionItem[]>>('get', `/academic/struktur-organisasi/${id}/permissions`, { params: { tenant_id } });
};

export const updateStrukturPermissions = async (
  id: string,
  permissionIds: string[],
  tenantId?: string // Optional context override
): Promise<ApiResponse<StrukturPermissionItem[]>> => {
  return requestWithFallback<ApiResponse<StrukturPermissionItem[]>>(
    'put',
    `/academic/struktur-organisasi/${id}/permissions`,
    { 
      data: { permission_ids: permissionIds },
      params: tenantId ? { tenant_id: tenantId } : undefined 
    }
  );
};

export const distributeStrukturPermissions = async (
  id: string,
  tenantId?: string
): Promise<ApiResponse<{ count: number; targets: string[]; message: string }>> => {
  return requestWithFallback<ApiResponse<{ count: number; targets: string[]; message: string }>>(
    'post',
    `/academic/struktur-organisasi/${id}/distribute`,
    { 
      data: {},
      params: tenantId ? { tenant_id: tenantId } : undefined 
    }
  );
};
