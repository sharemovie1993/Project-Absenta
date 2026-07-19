import { requestWithFallback } from '../apiUtils';

export interface PembinaKegiatanEskulItem {
  id: string;
  guru_id: string;
  nip: string;
  nama_guru: string;
  joined_at: string;
  eskul_id?: string;
  eskul_nama?: string;
}

export interface GuruPickerItem {
  id: string;
  nip: string;
  nama_guru: string;
}

export async function getPembinaKegiatanEskul(jenisKegiatanId: string): Promise<PembinaKegiatanEskulItem[]> {
  const res = await requestWithFallback<{ success: boolean; data: PembinaKegiatanEskulItem[] }>('get', `/attendance/pembina-kegiatan-eskul/${jenisKegiatanId}`);
  return res.data ?? [];
}

export async function getGuruPickerList(search?: string): Promise<GuruPickerItem[]> {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  const res = await requestWithFallback<{ success: boolean; data: GuruPickerItem[] }>('get', '/attendance/pembina-kegiatan-eskul/guru-picker', { params });
  return res.data ?? [];
}

export async function addPembinaKegiatanEskul(jenisKegiatanId: string, guruIds: string[]): Promise<void> {
  await requestWithFallback<void>('post', `/attendance/pembina-kegiatan-eskul/${jenisKegiatanId}/add`, {
    data: { guru_ids: guruIds }
  });
}

export async function removePembinaKegiatanEskul(pembinaId: string): Promise<void> {
  await requestWithFallback<void>('delete', `/attendance/pembina-kegiatan-eskul/member/${pembinaId}`);
}
