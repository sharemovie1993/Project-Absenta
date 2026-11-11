import { requestWithFallback } from "../apiUtils";
import { importDataFromExcel } from "../../utils/import.utils";
import type { GuruMapel, TeachingMode, UnitPengajaran, SumatifSlot } from "../../types/academic";

export interface ListGuruMapelResponse {
  success: boolean;
  message: string;
  data: GuruMapel[];
}

export interface SingleGuruMapelResponse {
  success: boolean;
  message: string;
  data: GuruMapel;
}

export interface UnitInputPayload {
  id?: string;
  nama_unit?: string | null;
  guru_id: string;
  jp_alokasi?: number;
  target_sumatif_slot?: SumatifSlot | string | null;
  urutan?: number;
  is_active?: boolean;
}

export interface CreateGuruMapelPayload {
  guru_id: string;
  mapel_id: string;
  kelas_id?: string | null;
  jurusan_id?: string | null;
  tahun_pelajaran_id?: string | null;
  semester_id?: string | null;
  teaching_mode?: TeachingMode;
  units?: UnitInputPayload[];
}

// GET /api/kurikulum/guru-mapel
export const listGuruMapel = async (
  filters?: { guru_id?: string; mapel_id?: string; kelas_id?: string; jurusan_id?: string; tahun_pelajaran_id?: string; semester_id?: string }
): Promise<ListGuruMapelResponse> => {
  const params = new URLSearchParams();
  if (filters?.guru_id) params.append('guru_id', filters.guru_id);
  if (filters?.mapel_id) params.append('mapel_id', filters.mapel_id);
  if (filters?.kelas_id) params.append('kelas_id', filters.kelas_id);
  if (filters?.jurusan_id) params.append('jurusan_id', filters.jurusan_id);
  if (filters?.tahun_pelajaran_id) params.append('tahun_pelajaran_id', filters.tahun_pelajaran_id);
  if (filters?.semester_id) params.append('semester_id', filters.semester_id);

  const url = `/kurikulum/guru-mapel${params.toString() ? `?${params.toString()}` : ''}`;
  return requestWithFallback<ListGuruMapelResponse>('get', url);
};

// POST /api/kurikulum/guru-mapel
export const assignGuruMapel = async (
  payload: CreateGuruMapelPayload
): Promise<SingleGuruMapelResponse> => {
  return requestWithFallback<SingleGuruMapelResponse>('post', '/kurikulum/guru-mapel', { data: payload });
};

// DELETE /api/kurikulum/guru-mapel/:id
export const removeGuruMapel = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/kurikulum/guru-mapel/${id}`);
};

// POST /api/kurikulum/guru-mapel/import
export const importGuruMapelFromExcel = async (
  file: File,
  onProgress?: (progress: number) => void
) => {
  return importDataFromExcel('/kurikulum/guru-mapel/import', file, onProgress);
};

// POST /api/kurikulum/guru-mapel/sync-from-jadwal
export const syncGuruMapelFromJadwal = async (payload?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
}): Promise<{ success: boolean; message: string; data: { syncedCount: number; totalAssignments: number } }> => {
  return requestWithFallback('post', '/kurikulum/guru-mapel/sync-from-jadwal', { data: payload });
};

// GET/PUT /api/kurikulum/guru-mapel/policy
export const getKurikulumPolicy = async (): Promise<{
  success: boolean;
  data: { kurikulum_lock_mid_semester_split: boolean };
}> => {
  return requestWithFallback('get', '/kurikulum/guru-mapel/policy');
};

export const updateKurikulumPolicy = async (payload: {
  kurikulum_lock_mid_semester_split: boolean;
}): Promise<{
  success: boolean;
  message: string;
  data: { kurikulum_lock_mid_semester_split: boolean };
}> => {
  return requestWithFallback('put', '/kurikulum/guru-mapel/policy', { data: payload });
};

// GET /api/kurikulum/guru-mapel/units
export const listTenantUnits = async (filters?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  kelas_id?: string;
  jurusan_id?: string;
  mapel_id?: string;
  guru_id?: string;
  is_active?: boolean;
}): Promise<{ success: boolean; data: UnitPengajaran[] }> => {
  const params = new URLSearchParams();
  if (filters?.tahun_pelajaran_id) params.append('tahun_pelajaran_id', filters.tahun_pelajaran_id);
  if (filters?.semester_id) params.append('semester_id', filters.semester_id);
  if (filters?.kelas_id) params.append('kelas_id', filters.kelas_id);
  if (filters?.jurusan_id) params.append('jurusan_id', filters.jurusan_id);
  if (filters?.mapel_id) params.append('mapel_id', filters.mapel_id);
  if (filters?.guru_id) params.append('guru_id', filters.guru_id);
  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
  const qs = params.toString();
  return requestWithFallback('get', `/kurikulum/guru-mapel/units${qs ? `?${qs}` : ''}`);
};

export const listUnitPengajaran = listTenantUnits;

// GET /api/kurikulum/guru-mapel/:id/units
export const getGuruMapelUnits = async (id: string): Promise<{
  success: boolean;
  data: {
    guru_mapel: GuruMapel;
    units: UnitPengajaran[];
    total_active_jp: number;
    struktur_jp_per_minggu: number | null;
    warning: string | null;
    policy: { kurikulum_lock_mid_semester_split: boolean };
  };
}> => {
  return requestWithFallback('get', `/kurikulum/guru-mapel/${id}/units`);
};

// PUT /api/kurikulum/guru-mapel/:id/mode
export const switchGuruMapelMode = async (
  id: string,
  payload: {
    teaching_mode: TeachingMode;
    units?: UnitInputPayload[];
    confirmMidSemesterSplit?: boolean;
  }
): Promise<{
  success: boolean;
  message?: string;
  data: { guru_mapel: GuruMapel; struktur_jp_per_minggu: number | null; warning: string | null };
}> => {
  return requestWithFallback('put', `/kurikulum/guru-mapel/${id}/mode`, { data: payload });
};

// POST /api/kurikulum/guru-mapel/:id/units
export const createUnitPengajaran = async (
  guruMapelId: string,
  payload: UnitInputPayload
): Promise<{
  success: boolean;
  message?: string;
  data: { unit: UnitPengajaran; struktur_jp_per_minggu: number | null; warning: string | null };
}> => {
  return requestWithFallback('post', `/kurikulum/guru-mapel/${guruMapelId}/units`, { data: payload });
};

// PUT /api/kurikulum/guru-mapel/units/:unitId
export const updateUnitPengajaran = async (
  unitId: string,
  payload: Partial<UnitInputPayload>
): Promise<{
  success: boolean;
  message?: string;
  data: { unit: UnitPengajaran; struktur_jp_per_minggu: number | null; warning: string | null };
}> => {
  return requestWithFallback('put', `/kurikulum/guru-mapel/units/${unitId}`, { data: payload });
};

// DELETE /api/kurikulum/guru-mapel/units/:unitId
export const removeUnitPengajaran = async (unitId: string): Promise<{ success: boolean; message?: string }> => {
  return requestWithFallback('delete', `/kurikulum/guru-mapel/units/${unitId}`);
};

// POST /api/kurikulum/guru-mapel/:id/units/copy-to-classes
export const copyUnitsToClasses = async (
  guruMapelId: string,
  targetKelasIds?: string[]
): Promise<{
  success: boolean;
  message?: string;
  data: { copied_classes: number; skipped_with_history: number; total_targets: number };
}> => {
  return requestWithFallback('post', `/kurikulum/guru-mapel/${guruMapelId}/units/copy-to-classes`, {
    data: { target_kelas_ids: targetKelasIds },
  });
};

// POST /api/kurikulum/guru-mapel/units/copy-from-semester
export const copyUnitsFromSemester = async (payload: {
  source_tahun_pelajaran_id: string;
  source_semester_id: string;
  target_tahun_pelajaran_id: string;
  target_semester_id: string;
}): Promise<{
  success: boolean;
  message?: string;
  data: { created_count: number; skipped_existing: number; source_total: number };
}> => {
  return requestWithFallback('post', '/kurikulum/guru-mapel/units/copy-from-semester', { data: payload });
};
