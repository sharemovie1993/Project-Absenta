import axiosInstance from '@/lib/axiosInstance';

export interface ServerNetworkInfo {
  primaryIp: string;
  allIps: { address: string; family: string; interface: string; isInternal: boolean }[];
  port: number;
}

export interface DapodikConfig {
  id?: string;
  tenant_id?: string;
  dapodik_host: string;
  npsn: string;
  api_token: string;
  is_active?: boolean;
  last_sync_at?: string | null;
  last_status?: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | null;
  school_name?: string | null;
  is_configured?: boolean;
}

export interface StudentDiffItem {
  field: string;
  label: string;
  dapodikValue: any;
  absentaValue: any;
}

export type StudentReconciliationStatus = 'MATCH' | 'MISMATCH' | 'DAPODIK_ONLY' | 'ABSENTA_ONLY';

export interface ReconciledStudent {
  id: string;
  nisn: string;
  nik: string | null;
  nis: string | null;
  nama: string;
  jenis_kelamin: string;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  rombel?: string | null;
  status: StudentReconciliationStatus;
  diffs: StudentDiffItem[];
  dapodikRaw?: any;
  absentaRaw?: any;
}

export interface ReconciliationSummary {
  totalDapodik: number;
  totalAbsenta: number;
  matchCount: number;
  mismatchCount: number;
  dapodikOnlyCount: number;
  absentaOnlyCount: number;
}

export interface StagingStorageMeta {
  exists: boolean;
  savedAt: string | null;
  totalStudents: number;
  npsn: string | null;
  host: string | null;
  fileSizeBytes: number;
}

export interface ReconciliationReport {
  summary: ReconciliationSummary;
  lastCheckAt: string;
  cacheInfo?: {
    isFromCache: boolean;
    cachedAt: string;
    totalCached: number;
    sourceMode?: 'LIVE' | 'STAGING';
  };
  stagingMeta?: StagingStorageMeta;
  students: ReconciledStudent[];
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  targetUrl?: string;
  schoolInfo?: {
    nama: string;
    npsn: string;
    bentuk_pendidikan: string;
    alamat: string;
    desa_kelurahan: string;
    kecamatan: string;
    status_sekolah: string;
  };
  details?: any;
}

export interface SyncStudentsPayload {
  action: 'UPDATE_SELECTED' | 'IMPORT_SELECTED';
  tahun_pelajaran_id?: string;
  semester_id?: string;
  students: {
    absentaId?: string;
    nisn?: string;
    nik?: string;
    nis?: string;
    nama: string;
    jenis_kelamin: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    rombel?: string;
    kelas_id?: string;
    jurusan_id?: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
  }[];
}

// ==================== API FUNCTIONS ====================

export const getDapodikServerInfo = async (): Promise<{ success: boolean; data: ServerNetworkInfo }> => {
  const response = await axiosInstance.get('/dapodik/server-info');
  return response.data;
};

export const getDapodikConfig = async (): Promise<{ success: boolean; data: DapodikConfig }> => {
  const response = await axiosInstance.get('/dapodik/config');
  return response.data;
};

export const saveDapodikConfig = async (data: DapodikConfig): Promise<{ success: boolean; message: string; data: DapodikConfig }> => {
  const response = await axiosInstance.post('/dapodik/config', data);
  return response.data;
};

export const testDapodikConnection = async (data?: Partial<DapodikConfig>): Promise<TestConnectionResponse> => {
  const response = await axiosInstance.post('/dapodik/test-connection', data);
  return response.data;
};

export interface CompareOptions {
  checkNama?: boolean;
  checkNis?: boolean;
  checkNisn?: boolean;
  checkNik?: boolean;
  checkKelas?: boolean;
  checkJenisKelamin?: boolean;
  checkTanggalLahir?: boolean;
  checkTempatLahir?: boolean;
  ignoreClassWhitespace?: boolean;
  onlyActiveStudents?: boolean;
}

export const getDapodikStudentComparison = async (
  options?: CompareOptions,
  forceRefresh?: boolean,
  sourceMode?: 'LIVE' | 'STAGING'
): Promise<{ success: boolean; data: ReconciliationReport }> => {
  const params: Record<string, any> = {};
  if (options) {
    if (options.checkNama !== undefined) params.check_nama = options.checkNama;
    if (options.checkNis !== undefined) params.check_nis = options.checkNis;
    if (options.checkNisn !== undefined) params.check_nisn = options.checkNisn;
    if (options.checkNik !== undefined) params.check_nik = options.checkNik;
    if (options.checkKelas !== undefined) params.check_kelas = options.checkKelas;
    if (options.checkJenisKelamin !== undefined) params.check_jenis_kelamin = options.checkJenisKelamin;
    if (options.checkTanggalLahir !== undefined) params.check_tanggal_lahir = options.checkTanggalLahir;
    if (options.checkTempatLahir !== undefined) params.check_tempat_lahir = options.checkTempatLahir;
    if (options.ignoreClassWhitespace !== undefined) params.ignore_class_whitespace = options.ignoreClassWhitespace;
    if (options.onlyActiveStudents !== undefined) params.only_active_students = options.onlyActiveStudents;
  }
  if (forceRefresh) {
    params.force_refresh = true;
  }
  if (sourceMode) {
    params.source_mode = sourceMode;
  }
  const response = await axiosInstance.get('/dapodik/compare-students', { params });
  return response.data;
};

export const getDapodikStagingMeta = async (): Promise<{ success: boolean; data: StagingStorageMeta }> => {
  const response = await axiosInstance.get('/dapodik/staging-meta');
  return response.data;
};

export const syncDapodikStudents = async (
  payload: SyncStudentsPayload
): Promise<{ success: boolean; message: string; updatedCount: number; importedCount: number }> => {
  const response = await axiosInstance.post('/dapodik/sync-students', payload);
  return response.data;
};
