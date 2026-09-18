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
  },
  getReplicationConfig: async () => {
    return requestWithFallback<StandardApiResponse<ReplicationConfig>>('get', '/admin/backups/replication/config', {});
  },
  saveReplicationConfig: async (data: Partial<ReplicationConfig>) => {
    return requestWithFallback<StandardApiResponse<ReplicationConfig>>('post', '/admin/backups/replication/config', { data });
  },
  testReplicationConnection: async (data?: Partial<ReplicationConfig>) => {
    return requestWithFallback<StandardApiResponse<{ latencyMs: number; message: string }>>('post', '/admin/backups/replication/test', { data });
  },
  getReplicationStatus: async () => {
    return requestWithFallback<StandardApiResponse<ReplicationStatusSummary>>('get', '/admin/backups/replication/status', {});
  },
  syncReplication: async () => {
    return requestWithFallback<StandardApiResponse<{
      totalPrimary: number;
      alreadyInTarget: number;
      replicatedCount: number;
      replicatedKeys: string[];
      message: string;
    }>>('post', '/admin/backups/replication/sync', {});
  }
};

export interface ReplicationConfig {
  enabled: boolean;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  forcePathStyle: boolean;
  lastSyncedAt?: string | null;
}

export interface ReplicationStatusSummary {
  primary: {
    endpoint: string;
    bucket: string;
    status: 'ONLINE' | 'OFFLINE';
    totalObjects: number;
    totalBytes: number;
  };
  replica: {
    enabled: boolean;
    endpoint: string;
    bucket: string;
    status: 'ONLINE' | 'OFFLINE' | 'DISABLED';
    totalObjects: number;
    totalBytes: number;
    lastSyncedAt?: string | null;
  };
}

