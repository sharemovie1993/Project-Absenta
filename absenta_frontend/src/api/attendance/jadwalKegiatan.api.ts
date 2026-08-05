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
  dibuat_oleh: string;
  created_at: string;
  updated_at: string;
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
