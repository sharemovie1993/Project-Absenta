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
  return requestWithFallback<{ success: boolean; data: JadwalKegiatanItem[] }>('get', '/kesiswaan/jadwal-kegiatan', { params });
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
