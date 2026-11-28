import { requestWithFallback } from '../apiUtils';

export type PeriodeKbmTipe = 'PKL' | 'KBM_BLOK' | 'NON_KBM';
export type KelompokMapelBlok = 'PRODUKTIF' | 'UMUM' | 'MUATAN_LOKAL';

export interface PeriodeOperasionalKbmItem {
  id: string;
  tenant_id: string;
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  nama: string;
  tipe: PeriodeKbmTipe;
  kelompok_aktif?: KelompokMapelBlok | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  target_semua_kelas: boolean;
  target_kelas_ids: string[];
  target_tingkat_label?: string;
  keterangan?: string | null;
  aktif: boolean;
  TahunPelajaran?: { id: string; tahun: string } | null;
  Semester?: { id: string; nama_semester: string } | null;
  created_at: string;
  updated_at: string;
}

export interface SavePeriodeOperasionalKbmPayload {
  tahun_pelajaran_id?: string;
  semester_id?: string | null;
  nama: string;
  tipe: PeriodeKbmTipe;
  kelompok_aktif?: KelompokMapelBlok | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  target_semua_kelas: boolean;
  target_kelas_ids: string[];
  keterangan?: string | null;
  aktif?: boolean;
}

export interface CbtSyncedEventSummary {
  id: string;
  nama_event: string;
  kode_event: string;
  semester: string;
  target_tingkat: number[];
  non_kbm_extra_tingkat: number[];
  suspend_kbm_during_exam: boolean;
  exam_dates: string[];
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
}

export async function getPeriodeOperasionalKbm(params?: {
  tahun_pelajaran_id?: string;
  tipe?: string;
  aktif?: boolean;
}): Promise<{
  success: boolean;
  data: PeriodeOperasionalKbmItem[];
  cbt_synced_events?: CbtSyncedEventSummary[];
}> {
  return requestWithFallback<{
    success: boolean;
    data: PeriodeOperasionalKbmItem[];
    cbt_synced_events?: CbtSyncedEventSummary[];
  }>(
    'get',
    '/kurikulum/periode-kbm',
    {
      params,
      headers: { 'X-Skip-403-Redirect': 'true' },
    }
  );
}

export async function createPeriodeOperasionalKbm(
  data: SavePeriodeOperasionalKbmPayload
): Promise<{ success: boolean; message: string; data: PeriodeOperasionalKbmItem }> {
  return requestWithFallback<{ success: boolean; message: string; data: PeriodeOperasionalKbmItem }>(
    'post',
    '/kurikulum/periode-kbm',
    { data }
  );
}

export async function updatePeriodeOperasionalKbm(
  id: string,
  data: Partial<SavePeriodeOperasionalKbmPayload>
): Promise<{ success: boolean; message: string; data: PeriodeOperasionalKbmItem }> {
  return requestWithFallback<{ success: boolean; message: string; data: PeriodeOperasionalKbmItem }>(
    'put',
    `/kurikulum/periode-kbm/${id}`,
    { data }
  );
}

export async function deletePeriodeOperasionalKbm(
  id: string
): Promise<{ success: boolean; message: string }> {
  return requestWithFallback<{ success: boolean; message: string }>(
    'delete',
    `/kurikulum/periode-kbm/${id}`
  );
}
