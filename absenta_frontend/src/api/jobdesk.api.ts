import { requestWithFallback } from "./apiUtils";

export interface JobdeskData {
  roleJobdesk: {
    role_name: string;
    description: string | null;
    tasks: string[];
  } | null;
  positionJobdesks: Array<{
    position_id: string;
    position_code: string;
    position_name: string;
    description: string | null;
    tasks: string[];
  }>;
}

export interface JobdeskResponse {
  success: boolean;
  message: string;
  data: JobdeskData;
}

export interface AdminRoleJobdeskItem {
  id: string;
  name: string;
  description: string | null;
  jobdesk: {
    id: string;
    role_id: string;
    description: string | null;
    tasks: string[];
  } | null;
}

export interface AdminRoleJobdesksResponse {
  success: boolean;
  message: string;
  data: AdminRoleJobdeskItem[];
}

export interface AdminPositionJobdeskItem {
  id: string;
  code: string;
  name: string;
  jobdesk: {
    id: string;
    position_id: string;
    description: string | null;
    tasks: string[];
  } | null;
}

export interface AdminPositionJobdesksResponse {
  success: boolean;
  message: string;
  data: AdminPositionJobdeskItem[];
}

/**
 * Mengambil data jobdesk milik user yang sedang aktif (Role + Jabatan Struktural)
 */
export async function getMyJobdesk(): Promise<JobdeskResponse> {
  return requestWithFallback<JobdeskResponse>('get', '/jobdesk/my');
}

/**
 * Mengambil list Role beserta Jobdesk untuk GUI Editor (Admin/Superadmin)
 */
export async function getAdminRoleJobdesks(tenantId?: string): Promise<AdminRoleJobdesksResponse> {
  const params = tenantId ? { tenantId } : {};
  return requestWithFallback<AdminRoleJobdesksResponse>('get', '/jobdesk/admin/roles', { params });
}

/**
 * Menyimpan / Update Jobdesk untuk Role tertentu (Admin/Superadmin)
 */
export async function updateRoleJobdesk(
  roleId: string,
  description: string | null,
  tasks: string[]
): Promise<any> {
  return requestWithFallback<any>('put', `/jobdesk/admin/roles/${roleId}`, {
    data: { description, tasks }
  });
}

/**
 * Mengambil list Jabatan beserta Jobdesk untuk GUI Editor (Admin/Superadmin)
 */
export async function getAdminPositionJobdesks(tenantId?: string): Promise<AdminPositionJobdesksResponse> {
  const params = tenantId ? { tenantId } : {};
  return requestWithFallback<AdminPositionJobdesksResponse>('get', '/jobdesk/admin/positions', { params });
}

/**
 * Menyimpan / Update Jobdesk untuk Jabatan tertentu (Admin/Superadmin)
 */
export async function updatePositionJobdesk(
  positionId: string,
  description: string | null,
  tasks: string[]
): Promise<any> {
  return requestWithFallback<any>('put', `/jobdesk/admin/positions/${positionId}`, {
    data: { description, tasks }
  });
}
