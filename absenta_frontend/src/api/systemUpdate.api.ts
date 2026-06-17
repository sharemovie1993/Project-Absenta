import axiosInstance from '@/lib/axiosInstance';

export interface CommitInfo {
  hash: string;
  message: string;
}

export interface UpdateCheckData {
  isBehind: boolean;
  backendCommits: CommitInfo[];
  frontendCommits: CommitInfo[];
}

export interface UpdateProgress {
  status: 'idle' | 'running' | 'success' | 'failed';
  step:
    | 'pulling_backend'
    | 'pulling_frontend'
    | 'installing_backend'
    | 'installing_frontend'
    | 'migrating'
    | 'building_frontend'
    | 'restarting'
    | 'done'
    | 'error';
  message: string;
  error?: string;
  updatedAt?: string;
  isDryRun?: boolean;
}

export const systemUpdateApi = {
  check: () =>
    axiosInstance.get<{ success: boolean; data: UpdateCheckData }>('/system/update/check').then(r => r.data),

  status: () =>
    axiosInstance.get<{ success: boolean; data: UpdateProgress }>('/system/update/status').then(r => r.data),

  execute: () =>
    axiosInstance.post<{ success: boolean; message: string }>('/system/update/execute').then(r => r.data),

  restart: () =>
    axiosInstance.post<{ success: boolean; message: string }>('/system/update/restart').then(r => r.data),
};
