import { requestWithFallback } from '../apiUtils';

export interface JadwalKegiatanItem {
  id: string;
  tenant_id: string;
  nama: string;
  jenis_kegiatan: string;
  hari: string[];
  waktu_mulai: string;
  waktu_selesai?: string | null;
  target_semua_kelas: boolean;
  target_kelas_ids: string[];
  berlaku_mulai: string;
  berlaku_sampai?: string | null;
  aktif: boolean;
  termasuk_siklus_ketarunaan?: boolean;
  wajib_tap_terminal_guru?: boolean;
  wajib_guru_beririsan?: boolean;
  wajib_positions_configured?: boolean;
  wajib_position_ids?: string[];
  wajib_position_codes?: string[];
  dibuat_oleh: string;
  created_at: string;
  updated_at: string;
}

export interface AvailableKegiatanPosition {
  id: string;
  code: string;
  name: string;
  scope_type: string;
}

export interface JadwalKegiatanPolicyItem {
  id: string;
  jadwal_kegiatan_ids: string[];
  nama: string;
  jenis_kegiatan: string;
  hari: string[];
  waktu_mulai: string;
  waktu_selesai?: string | null;
  aktif: boolean;
  termasuk_siklus_ketarunaan?: boolean;
  is_apel_pulang: boolean;
  is_dhuha: boolean;
  wajib_tap_terminal_guru: boolean;
  wajib_guru_beririsan: boolean;
  wajib_positions_configured: boolean;
  wajib_position_ids: string[];
  wajib_position_codes: string[];
}

export interface JadwalKegiatanPolicySummaryResponse {
  success: boolean;
  data: {
    available_positions: AvailableKegiatanPosition[];
    policies: JadwalKegiatanPolicyItem[];
  };
}

export interface UpdateJadwalKegiatanPolicyPayload {
  wajib_tap_terminal_guru: boolean;
  wajib_guru_beririsan: boolean;
  wajib_position_ids: string[];
  jadwal_kegiatan_ids?: string[];
}

export async function getJadwalKegiatan(params?: { aktif?: boolean }): Promise<{ success: boolean; data: JadwalKegiatanItem[] }> {
  try {
    const res = await requestWithFallback<{ success: boolean; data: JadwalKegiatanItem[] }>('get', '/kesiswaan/jadwal-kegiatan', {
      params,
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
    if (res && (Array.isArray(res) || (res as any).data)) return res;
    throw new Error('Empty response from /kesiswaan/jadwal-kegiatan');
  } catch (err) {
    console.warn('[JadwalKegiatan API] Primary /kesiswaan/jadwal-kegiatan failed, trying fallback...', err);
    try {
      const res2 = await requestWithFallback<{ success: boolean; data: JadwalKegiatanItem[] }>('get', '/kurikulum/jadwal-kegiatan', {
        params,
        headers: { 'X-Skip-403-Redirect': 'true' }
      });
      if (res2 && (Array.isArray(res2) || (res2 as any).data)) return res2;
      throw new Error('Empty response from /kurikulum/jadwal-kegiatan');
    } catch (err2) {
      console.warn('[JadwalKegiatan API] Fallback /kurikulum/jadwal-kegiatan failed, trying /academic/jenis-kegiatan-master...', err2);
      return await requestWithFallback<{ success: boolean; data: JadwalKegiatanItem[] }>('get', '/academic/jenis-kegiatan-master', {
        params,
        headers: { 'X-Skip-403-Redirect': 'true' }
      }).catch((e3) => {
        console.error('[JadwalKegiatan API] All endpoints failed:', e3);
        return { success: false, data: [] };
      });
    }
  }
}

export async function getJadwalKegiatanDetail(id: string): Promise<{ success: boolean; data: JadwalKegiatanItem }> {
  return requestWithFallback<{ success: boolean; data: JadwalKegiatanItem }>('get', `/kesiswaan/jadwal-kegiatan/${id}`);
}

export async function createJadwalKegiatan(data: Partial<JadwalKegiatanItem>): Promise<{ success: boolean; message: string; data: JadwalKegiatanItem }> {
  return requestWithFallback<{ success: boolean; message: string; data: JadwalKegiatanItem }>('post', '/kesiswaan/jadwal-kegiatan', { data });
}

export async function updateJadwalKegiatan(id: string, data: Partial<JadwalKegiatanItem>): Promise<{ success: boolean; message: string; data: JadwalKegiatanItem }> {
  return requestWithFallback<{ success: boolean; message: string; data: JadwalKegiatanItem }>('put', `/kesiswaan/jadwal-kegiatan/${id}`, { data });
}

export async function deleteJadwalKegiatan(id: string): Promise<{ success: boolean; message: string }> {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/kesiswaan/jadwal-kegiatan/${id}`);
}

export async function getJadwalKegiatanPolicySummary(): Promise<JadwalKegiatanPolicySummaryResponse> {
  try {
    return await requestWithFallback<JadwalKegiatanPolicySummaryResponse>(
      'get',
      '/kesiswaan/jadwal-kegiatan/policy-summary',
      { headers: { 'X-Skip-403-Redirect': 'true' } }
    );
  } catch {
    return await requestWithFallback<JadwalKegiatanPolicySummaryResponse>(
      'get',
      '/kurikulum/jadwal-kegiatan/policy-summary',
      { headers: { 'X-Skip-403-Redirect': 'true' } }
    );
  }
}

export async function updateJadwalKegiatanPolicy(
  id: string,
  data: UpdateJadwalKegiatanPolicyPayload
): Promise<{ success: boolean; message: string; data: any }> {
  try {
    return await requestWithFallback<{ success: boolean; message: string; data: any }>(
      'put',
      `/kesiswaan/jadwal-kegiatan/policy/${id}`,
      { data }
    );
  } catch {
    return await requestWithFallback<{ success: boolean; message: string; data: any }>(
      'put',
      `/kurikulum/jadwal-kegiatan/policy/${id}`,
      { data }
    );
  }
}
