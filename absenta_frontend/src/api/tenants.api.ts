import { requestWithFallback } from "./apiUtils";

// Types based on TENANT_MODULE_API.md and TenantsPage interface
export type AbsensiMode = 'SIMPLE' | 'MULTI_SESI';

interface Tenant {
  id: string;
  name: string;
  absensi_mode: AbsensiMode;
  domain?: string;
  logo_url?: string;
  logo_daerah_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  nama_dinas_atas?: string;
  nama_dinas_bawah?: string;
  nama_cabang_dinas?: string;
  print_header_lines?: string[];
  is_active: boolean;
  subscription_plan?: string;
  subscription_start?: string;
  subscription_end?: string;
  subscription_expires_at?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_DELETION' | 'DELETED';
  deletion_requested_at?: string | null;
  max_users?: number;
  current_users?: number;
  user_count?: number;
  billing_count?: number;
  active_subscriptions?: number;
  total_users?: number;
  jam_masuk_default?: string;
  jam_pulang_default?: string;
  toleransi_keterlambatan_menit?: number;
  created_at: string;
  updated_at: string;
  kepala_sekolah?: string | null;
  nip_kepala?: string | null;
  kota?: string | null;
}

export interface CreateTenantRequest {
  name: string;
  absensi_mode?: AbsensiMode;
  domain?: string;
  logo_url?: string;
  logo_daerah_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  nama_dinas_atas?: string;
  nama_dinas_bawah?: string;
  nama_cabang_dinas?: string;
  print_header_lines?: string[];
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  subscription_plan?: string;
  subscription_start?: string;
  subscription_end?: string;
  max_users?: number;
  jam_masuk_default?: string;
  jam_pulang_default?: string;
  toleransi_keterlambatan_menit?: number;
  kepala_sekolah?: string;
  nip_kepala?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  absensi_mode?: AbsensiMode;
  domain?: string;
  logo_url?: string;
  logo_daerah_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  nama_dinas_atas?: string;
  nama_dinas_bawah?: string;
  nama_cabang_dinas?: string;
  print_header_lines?: string[];
  is_active?: boolean;
  subscription_plan?: string;
  subscription_start?: string;
  subscription_end?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  max_users?: number;
  jam_masuk_default?: string;
  jam_pulang_default?: string;
  toleransi_keterlambatan_menit?: number;
  kepala_sekolah?: string;
  nip_kepala?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface TenantsResponse {
  success: boolean;
  message: string;
  data: Tenant[];
  pagination?: PaginationInfo;
}

export interface TenantResponse {
  success: boolean;
  message: string;
  data: Tenant;
}

export interface DeleteTenantResponse {
  success: boolean;
  message: string;
}

// API Functions
export async function getAllTenants(params?: {
  page?: number;
  limit?: number;
  search?: string;
}, options?: { skipTenantHeader?: boolean }): Promise<TenantsResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    
    const url = `/tenants${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const headers = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
    return requestWithFallback<TenantsResponse>('get', url, { headers });
  } catch (error) {
    throw error;
  }
}

// Export types
export type { Tenant };

export async function getTenantById(id: string, options?: { skipTenantHeader?: boolean }): Promise<TenantResponse> {
  try {
    const headers = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
    return requestWithFallback<TenantResponse>('get', `/tenants/${id}`, { headers });
  } catch (error) {
    throw error;
  }
}

export async function getMyTenant(): Promise<TenantResponse> {
  return requestWithFallback<TenantResponse>('get', '/me/tenant', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function createTenant(
  tenantData: CreateTenantRequest,
  options?: { skipTenantHeader?: boolean }
): Promise<TenantResponse> {
  try {
    const headers = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
    return requestWithFallback<TenantResponse>('post', '/tenants', { data: tenantData, headers });
  } catch (error) {
    throw error;
  }
}

export async function updateTenant(id: string, tenantData: UpdateTenantRequest): Promise<TenantResponse> {
  try {
    return requestWithFallback<TenantResponse>('put', `/tenants/${id}`, { data: tenantData });
  } catch (error) {
    throw error;
  }
}

export async function deleteTenant(id: string, confirmationName?: string, force?: boolean): Promise<DeleteTenantResponse> {
  try {
    const payload = confirmationName ? { confirmationName, force } : undefined;
    return requestWithFallback<DeleteTenantResponse>('delete', `/tenants/${id}`, { data: payload });
  } catch (error) {
    throw error;
  }
}

export async function requestDeletion(id: string): Promise<TenantResponse> {
  try {
    return requestWithFallback<TenantResponse>('post', `/tenants/${id}/request-deletion`);
  } catch (error) {
    throw error;
  }
}

export async function cancelDeletion(id: string): Promise<TenantResponse> {
  try {
    return requestWithFallback<TenantResponse>('post', `/tenants/${id}/cancel-deletion`);
  } catch (error) {
    throw error;
  }
}

// Export sebagai object untuk kemudahan penggunaan
export const tenantApi = {
  getAllTenants,
  getTenantById,
  getMyTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  requestDeletion,
  cancelDeletion
};
