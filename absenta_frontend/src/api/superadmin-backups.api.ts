import { requestWithFallback, type StandardApiResponse } from './apiUtils';
import axios from '@/lib/axiosInstance';

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

export interface ImportBundleOptions {
  targetTenantId?: string;
  targetSubdomain?: string;
  targetName?: string;
  cloneMode?: boolean;
}

export const backupApi = {
  list: async () => {
    return requestWithFallback<StandardApiResponse<Backup[]>>('get', '/admin/backups', {});
  },
  restore: async (id: string, newTenantId: string) => {
    return requestWithFallback<StandardApiResponse>('post', `/admin/backups/${id}/restore`, { data: { newTenantId } });
  },
  cloneSnapshot: async (id: string, payload: { targetSubdomain: string; targetName?: string }) => {
    const res = await axios.post(`/admin/backups/${id}/clone`, payload, {
      timeout: 600000 // 10 menit untuk dataset besar + aset MinIO
    });
    return res.data;
  },
  downloadBlob: async (id: string) => {
    const response = await axios.get(`/admin/backups/${id}/download`, {
      responseType: 'blob'
    });
    return response.data as Blob;
  },
  exportBundle: async (tenantId?: string, options?: { includeAttendance?: boolean; includeMedia?: boolean }) => {
    const response = await axios.post('/admin/backups/export-bundle', {
      tenantId: tenantId || undefined,
      includeAttendance: options?.includeAttendance !== false,
      includeMedia: options?.includeMedia !== false,
    }, {
      responseType: 'blob',
      timeout: 600000 // 10 menit
    });
    return response.data;
  },
  inspectBundle: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post('/admin/backups/inspect-bundle', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000 // 3 menit
    });
    return res.data;
  },
  importBundle: async (file: File, options?: string | ImportBundleOptions) => {
    const formData = new FormData();
    formData.append('file', file);

    const opts: ImportBundleOptions = typeof options === 'string'
      ? { targetTenantId: options }
      : (options || {});

    const params: Record<string, any> = {};
    if (opts.targetTenantId) params.targetTenantId = opts.targetTenantId;
    if (opts.targetSubdomain) params.targetSubdomain = opts.targetSubdomain;
    if (opts.targetName) params.targetName = opts.targetName;
    if (opts.cloneMode !== undefined) params.cloneMode = opts.cloneMode;

    const res = await axios.post('/admin/backups/import-bundle', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000 // 10 menit untuk dataset ribuan siswa & guru
    });
    return res.data;
  },
  getReplicationConfig: async () => {
    return requestWithFallback<StandardApiResponse<ReplicationConfig>>('get', '/admin/backups/replication/config', {});
  },
  saveReplicationConfig: async (data: Partial<ReplicationConfig>) => {
    return requestWithFallback<StandardApiResponse<ReplicationConfig>>('post', '/admin/backups/replication/config', { data });
  },
  testReplicationConnection: async (data?: { tier?: 'tier2' | 'tier3'; config?: Partial<NodeConfig> } | any) => {
    return requestWithFallback<StandardApiResponse<{ latencyMs: number; message: string }>>('post', '/admin/backups/replication/test', { data });
  },
  getReplicationStatus: async () => {
    return requestWithFallback<StandardApiResponse<ReplicationStatusSummary>>('get', '/admin/backups/replication/status', {});
  },
  syncReplication: async (targetTier?: 'all' | 'tier2' | 'tier3') => {
    return requestWithFallback<StandardApiResponse<{
      totalPrimary: number;
      tier2Result?: { replicatedCount: number; alreadyInTarget: number };
      tier3Result?: { replicatedCount: number; alreadyInTarget: number };
      replicatedCount: number;
      replicatedKeys: string[];
      message: string;
    }>>('post', '/admin/backups/replication/sync', { data: { targetTier } }, { timeout: 600000 });
  },
  createManualSnapshot: async (tenantId: string) => {
    return requestWithFallback<StandardApiResponse<Backup>>('post', '/admin/backups/create-snapshot', { data: { tenantId } }, { timeout: 600000 });
  },
  factoryResetToFreshBaseline: async (confirmation: string) => {
    return requestWithFallback<StandardApiResponse<{
      deletedTenantsCount: number;
      baselineSnapshot?: Backup | null;
      message: string;
    }>>('post', '/admin/backups/factory-reset', { data: { confirmation } }, { timeout: 600000 });
  }
};

export interface NodeConfig {
  enabled: boolean;
  name?: string;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  forcePathStyle: boolean;
  lastSyncedAt?: string | null;
}

export interface MultiTierReplicationConfig {
  tier2: NodeConfig;
  tier3: NodeConfig;
}

export type ReplicationConfig = MultiTierReplicationConfig;

export interface NodeStatus {
  enabled: boolean;
  name: string;
  endpoint: string;
  bucket: string;
  status: 'ONLINE' | 'OFFLINE' | 'DISABLED';
  totalObjects: number;
  totalBytes: number;
  keys?: string[];
  lastSyncedAt?: string | null;
}

export interface ReplicationStatusSummary {
  primary: {
    name?: string;
    endpoint: string;
    bucket: string;
    status: 'ONLINE' | 'OFFLINE';
    totalObjects: number;
    totalBytes: number;
  };
  tier2: NodeStatus;
  tier3: NodeStatus;
  replica?: NodeStatus; // backward compatibility
}

