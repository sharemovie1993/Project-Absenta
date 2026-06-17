import { requestWithFallback } from "./apiUtils";

// Interfaces for API responses
export interface User {
  id: string;
  tenant_id?: string;
  email: string;
  full_name: string;
  role_id: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
  // Relations
  role?: {
    id: string;
    name: string;
  };
  tenant?: {
    id: string;
    name: string;
  };
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
  permissions?: string | string[] | null;
  permission_count?: number;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description?: string | null;
  permissions?: string[] | null;
}

export interface PermissionCatalogItem {
  id: string;
  description?: string | null;
  group?: string | null;
  module?: string | null;
  scope_template?: unknown;
}

export interface TenantItem {
  id: string;
  name: string;
}

export interface UserPayload {
  email: string;
  password?: string;
  full_name: string;
  role_id: string;
  tenant_id?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface PaginatedUserResponse {
  success: boolean;
  message: string;
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleUserResponse {
  success: boolean;
  message: string;
  data: User;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

// User CRUD Operations
export const getUsers = async (
  page = 1,
  limit = 10,
  search = "",
  tenantId?: string,
  options?: { skipTenantHeader?: boolean },
  extraFilters?: { role?: string; status?: string; tenant?: string }
): Promise<PaginatedUserResponse> => {
  const params: any = { page, limit };
  if (search) params.search = search;
  if (extraFilters?.role) params.role = extraFilters.role;
  if (extraFilters?.status) params.status = extraFilters.status.toUpperCase();
  if (extraFilters?.tenant) params.tenant = extraFilters.tenant;

  const headers: any = {};
  if (options?.skipTenantHeader) {
    headers["X-Skip-Tenant"] = "true";
  } else if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }

  return requestWithFallback<PaginatedUserResponse>('get', `/users`, { params, headers });
};

export const getUserById = async (
  id: string,
  tenantId?: string,
  options?: { skipTenantHeader?: boolean }
): Promise<SingleUserResponse> => {
  const headers: any = {};
  if (options?.skipTenantHeader) {
    headers["X-Skip-Tenant"] = "true";
  } else if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }

  return requestWithFallback<SingleUserResponse>('get', `/users/${id}`, { headers });
};

export const createUser = async (
  payload: UserPayload, 
  tenantId?: string
): Promise<SingleUserResponse> => {
  const headers: any = {};
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  
  return requestWithFallback<SingleUserResponse>('post', `/users`, { data: payload, headers });
};

export const updateUser = async (
  id: string, 
  payload: Partial<UserPayload>, 
  tenantId?: string
): Promise<SingleUserResponse> => {
  const headers: any = {};
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  
  return requestWithFallback<SingleUserResponse>('put', `/users/${id}`, { data: payload, headers });
};

export const deleteUser = async (
  id: string, 
  tenantId?: string
): Promise<ApiResponse> => {
  const headers: any = {};
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  
  return requestWithFallback<ApiResponse>('delete', `/users/${id}`, { headers });
};

export const resetUserPassword = async (
  id: string,
  newPassword: string,
  tenantId?: string
): Promise<ApiResponse> => {
  const headers: any = {};
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  
  return requestWithFallback<ApiResponse>('put', `/users/${id}/reset-password`, { data: { new_password: newPassword }, headers });
};

export const completeOnboarding = async (): Promise<ApiResponse> => {
  return requestWithFallback<ApiResponse>('put', `/users/me/onboarding`);
};

// --- Roles API ---
export const getRoles = async (): Promise<{ success: boolean; data: RoleItem[] }> => {
  return requestWithFallback<{ success: boolean; data: RoleItem[] }>('get', `/users/roles`);
};

export const getRoleByIdApi = async (
  id: string
): Promise<{ success: boolean; message: string; data?: RoleWithPermissions }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: RoleWithPermissions }>('get', `/users/roles/${id}`);
};

export const updateRolePermissions = async (
  id: string,
  permissions: string | null
): Promise<{ success: boolean; message: string; data?: RoleItem }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: RoleItem }>('put', `/users/roles/${id}/permissions`, { data: { permissions } });
};

export const createRole = async (
  payload: { name: string; description?: string | null; permissions?: string | null }
): Promise<{ success: boolean; message: string; data?: RoleItem }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: RoleItem }>('post', `/users/roles`, { data: payload });
};

export const updateRole = async (
  id: string,
  payload: { name?: string; description?: string | null; permissions?: string | null }
): Promise<{ success: boolean; message: string; data?: RoleItem }> => {
  return requestWithFallback<{ success: boolean; message: string; data?: RoleItem }>('put', `/users/roles/${id}`, { data: payload });
};

export const deleteRole = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/users/roles/${id}`);
};

export const getPermissionCatalog = async (): Promise<{ success: boolean; message: string; data: PermissionCatalogItem[] }> => {
  return requestWithFallback<{ success: boolean; message: string; data: PermissionCatalogItem[] }>('get', `/users/permissions`);
};

export const getUserEffectiveCapabilitiesApi = async (
  userId: string
): Promise<{ success: boolean; message: string; data: string[] }> => {
  return requestWithFallback<{ success: boolean; message: string; data: string[] }>(
    'get',
    `/users/effective-capabilities/${userId}`
  );
};

export const getTenants = async (): Promise<{ success: boolean; data: TenantItem[] }> => {
  return requestWithFallback<{ success: boolean; data: TenantItem[] }>('get', `/tenants`);
};

// Helper function to get users for dropdown (used in other modules)
export const getUsersForDropdown = async (
  tenantId?: string
): Promise<{ success: boolean; data: User[] }> => {
  const headers: any = {};
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  
  return requestWithFallback<{ success: boolean; data: User[] }>('get', `/users`, { params: { limit: 1000 }, headers });
};

// Self-service: update own email
export const updateMyEmail = async (
  newEmail: string,
  currentPassword: string
): Promise<SingleUserResponse> => {
  return requestWithFallback<SingleUserResponse>('put', `/users/me/email`, { data: { new_email: newEmail, current_password: currentPassword } });
};

// --- Policy Export/Import ---
export const exportPoliciesApi = async (): Promise<Blob> => {
  return requestWithFallback<Blob>('get', '/users/roles/export', {
    responseType: 'blob',
    unwrapData: false
  });
};

export const importPoliciesApi = async (data: { roles?: any[]; structures?: any[] }): Promise<ApiResponse> => {
  return requestWithFallback<ApiResponse>('post', '/users/roles/import', {
    data,
    unwrapData: false
  });
};

export const resetPoliciesApi = async (type: 'all' | 'roles' | 'structures' = 'all'): Promise<ApiResponse> => {
  return requestWithFallback<ApiResponse>('delete', '/users/roles/policies', {
    params: { type },
    unwrapData: false
  });
};

// Types are already exported above with export interface declarations
