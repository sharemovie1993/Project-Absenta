import { requestWithFallback, downloadBlob } from "../apiUtils";

export interface BackupHistoryItem {
  id: string;
  tenant_id?: string;
  snapshot_date: string;
  file_path: string;
  file_size_bytes: string | number;
  checksum_sha256: string;
  status: string;
  restore_status: string;
  restored_at?: string;
  Tenant?: { name: string; subdomain: string };
}

export const exportAcademicData = async (): Promise<Blob> => {
  return downloadBlob('/academic/backup/export');
};

export const importAcademicData = async (data: any): Promise<{ success: boolean; message: string; details?: any; audit?: any }> => {
  return requestWithFallback<{ success: boolean; message: string; details?: any; audit?: any }>('post', '/academic/backup/import', { data });
};

export const getBackupHistory = async (): Promise<BackupHistoryItem[]> => {
  const res = await requestWithFallback<{ success: boolean; data: BackupHistoryItem[] }>('get', '/admin/backups');
  return res.data || [];
};

export const purgeTenantData = async (): Promise<{ success: boolean; message: string; details?: any; audit?: any }> => {
  return requestWithFallback<{ success: boolean; message: string; details?: any; audit?: any }>('post', '/academic/backup/purge-tenant');
};
