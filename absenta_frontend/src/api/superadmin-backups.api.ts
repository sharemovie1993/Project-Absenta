import { requestWithFallback, type StandardApiResponse } from './apiUtils';

export interface Backup {
  id: string;
  tenant_id: string;
  snapshot_date: string;
  file_size_bytes: string; // BigInt serialized
  status: 'READY' | 'RESTORED' | 'PURGED';
  expires_at: string;
  Tenant?: {
      name: string;
      domain: string;
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
      const token = localStorage.getItem('token');
      // Adjust URL if needed (e.g. /api prefix)
      const response = await fetch(`/api/admin/backups/${id}/download`, {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });
      if (!response.ok) throw new Error('Download failed');
      return response.blob();
  }
};
