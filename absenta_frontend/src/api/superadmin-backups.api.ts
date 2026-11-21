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

export type BackupBundleMode = 'FULL' | 'DATABASE_ONLY' | 'MEDIA_ONLY';
export type RestoreBundleMode = 'AUTO' | 'FULL' | 'DATABASE_ONLY' | 'MEDIA_ONLY';

export interface ImportBundleOptions {
  targetTenantId?: string;
  targetSubdomain?: string;
  targetName?: string;
  cloneMode?: boolean;
  restoreMode?: RestoreBundleMode;
}

export interface BackupJobProgress {
  id: string;
  type: 'EXPORT' | 'RESTORE';
  tenantId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  stage: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  result?: {
    filepath?: string;
    filename?: string;
    size?: number;
    checksum_sha256?: string;
    manifest?: any;
    restoredTables?: Record<string, number>;
    targetSubdomain?: string;
    targetTenantId?: string;
    isCloned?: boolean;
  };
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
  exportBundle: async (tenantId?: string, options?: { mode?: BackupBundleMode; includeDatabase?: boolean; includeAttendance?: boolean; includeMedia?: boolean }) => {
    const response = await axios.post('/admin/backups/export-bundle', {
      tenantId: tenantId || undefined,
      mode: options?.mode,
      includeDatabase: options?.includeDatabase,
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
    if (opts.restoreMode) params.restoreMode = opts.restoreMode;

    const res = await axios.post('/admin/backups/import-bundle', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000 // 10 menit untuk dataset ribuan siswa & guru
    });
    return res.data;
  },
  // Asynchronous Background Job APIs (Mitigasi Timeout Skala Besar)
  startExportJob: async (tenantId?: string, options?: { mode?: BackupBundleMode; includeDatabase?: boolean; includeAttendance?: boolean; includeMedia?: boolean }) => {
    const res = await axios.post('/academic/backup/export-async', {
      tenantId: tenantId || undefined,
      mode: options?.mode,
      includeDatabase: options?.includeDatabase,
      includeAttendance: options?.includeAttendance !== false,
      includeMedia: options?.includeMedia !== false,
    });
    return res.data;
  },
  startRestoreJob: async (file: File, options?: string | ImportBundleOptions) => {
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
    if (opts.restoreMode) params.restoreMode = opts.restoreMode;

    const res = await axios.post('/academic/backup/import-async', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000
    });
    return res.data;
  },
  getJobStatus: async (jobId: string): Promise<BackupJobProgress> => {
    const res = await axios.get(`/academic/backup/jobs/${jobId}/status`);
    return res.data?.data;
  },
  downloadJobResult: async (jobId: string): Promise<Blob> => {
    const res = await axios.get(`/academic/backup/jobs/${jobId}/download`, {
      responseType: 'blob'
    });
    return res.data as Blob;
  },
  pollJobUntilDone: async (jobId: string, onProgress?: (job: BackupJobProgress) => void): Promise<BackupJobProgress> => {
    const startTime = Date.now();
    const maxWaitMs = 30 * 60 * 1000; // 30 menit

    while (Date.now() - startTime < maxWaitMs) {
      const job = await backupApi.getJobStatus(jobId);
      if (onProgress) {
        onProgress(job);
      }
      if (job.status === 'COMPLETED') {
        return job;
      }
      if (job.status === 'FAILED') {
        throw new Error(job.error || job.message || 'Pekerjaan background gagal.');
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error('Pekerjaan memakan waktu terlalu lama (melebihi batas 30 menit).');
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

