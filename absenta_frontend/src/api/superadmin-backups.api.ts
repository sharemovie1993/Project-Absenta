import { requestWithFallback, type StandardApiResponse } from './apiUtils';

export interface Backup {
  id: string;
  tenant_id: string;
  snapshot_date: string;
  file_size_bytes: string; // BigInt serialized
  file_path?: string;
  checksum_sha256?: string;
  status: 'READY' | 'RESTORED' | 'PURGED';
  expires_at: string;
  Tenant?: {
      name: string;
      subdomain?: string;
      domain?: string;
  }
}

export const backupApi = {
  list: async () => {
    return requestWithFallback<StandardApiResponse<Backup[]>>('get', '/admin/backups', {});
  },
  restore: async (id: string, newTenantId: string) => {
    return requestWithFallback<StandardApiResponse>('post', `/admin/backups/${id}/restore`, { data: { newTenantId } });
  },
  downloadBlob: async (id: string) => {
    const { default: axios } = await import('@/lib/axiosInstance');
    const response = await axios.get(`/admin/backups/${id}/download`, {
      responseType: 'blob'
    });
    return response.data as Blob;
  },
  exportBundle: async (tenantId?: string, options?: { includeAttendance?: boolean; includeMedia?: boolean }) => {
    const { default: axios } = await import('@/lib/axiosInstance');
    const response = await axios.post('/admin/backups/export-bundle', {
      tenantId: tenantId || undefined,
      includeAttendance: options?.includeAttendance !== false,
      includeMedia: options?.includeMedia !== false,
    }, {
      responseType: 'blob'
    });
    return response.data;
  },
  inspectBundle: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { default: axios } = await import('@/lib/axiosInstance');
    const res = await axios.post('/admin/backups/inspect-bundle', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  importBundle: async (file: File, targetTenantId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const { default: axios } = await import('@/lib/axiosInstance');
    const params = targetTenantId ? { targetTenantId } : {};
    const res = await axios.post('/admin/backups/import-bundle', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};

