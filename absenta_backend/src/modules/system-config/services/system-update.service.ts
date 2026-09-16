export type UpdateStatus = 'idle' | 'running' | 'success' | 'failed';
export type UpdateStep =
  | 'pulling_backend'
  | 'pulling_frontend'
  | 'installing_backend'
  | 'installing_frontend'
  | 'migrating'
  | 'building_frontend'
  | 'restarting'
  | 'done';

export interface UpdateProgress {
  status: UpdateStatus;
  step: UpdateStep | 'error';
  message: string;
  error?: string;
  updatedAt?: string;
  isDryRun?: boolean;
}

export interface CommitInfo {
  hash: string;
  message: string;
}

export interface UpdateCheckResult {
  isBehind: boolean;
  backendCommits: CommitInfo[];
  frontendCommits: CommitInfo[];
}

export function readProgress(): UpdateProgress {
  return {
    status: 'idle',
    step: 'done',
    message: 'Fitur pembaruan kode via platform dinonaktifkan. Pembaruan dikelola via deployer.',
  };
}

export async function checkUpdates(): Promise<UpdateCheckResult> {
  return {
    isBehind: false,
    backendCommits: [],
    frontendCommits: [],
  };
}

export async function executeUpdate(): Promise<void> {
  console.log('[Updater] Fitur pembaruan via platform dinonaktifkan. Gunakan deployer untuk pembaruan sistem.');
}
