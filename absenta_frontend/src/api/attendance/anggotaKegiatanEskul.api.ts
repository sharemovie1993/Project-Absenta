import { requestWithFallback } from '../apiUtils';

export interface AnggotaKegiatanEskulItem {
  id: string;
  siswa_akademik_id: string;
  nis: string;
  nama_siswa: string;
  kelas: string;
  kelas_id: string;
  joined_at: string;
  eskul_id?: string;
  eskul_nama?: string;
}

export interface SiswaAkademikPickerItem {
  siswa_akademik_id: string;
  siswa_id: string;
  nis: string;
  nama_siswa: string;
  kelas: string;
  kelas_id: string;
}

export async function getAnggotaKegiatanEskul(jenisKegiatanId: string): Promise<AnggotaKegiatanEskulItem[]> {
  const res = await requestWithFallback<{ success: boolean; data: AnggotaKegiatanEskulItem[] }>('get', `/attendance/anggota-kegiatan-eskul/${jenisKegiatanId}`);
  return res.data ?? [];
}

export async function getSiswaAkademikPickerList(search?: string, kelasId?: string): Promise<SiswaAkademikPickerItem[]> {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (kelasId) params.kelas_id = kelasId;
  const res = await requestWithFallback<{ success: boolean; data: SiswaAkademikPickerItem[] }>('get', '/attendance/anggota-kegiatan-eskul/siswa-picker', { params });
  return res.data ?? [];
}

export async function addAnggotaKegiatanEskul(jenisKegiatanId: string, siswaAkademikIds: string[]): Promise<void> {
  await requestWithFallback<void>('post', `/attendance/anggota-kegiatan-eskul/${jenisKegiatanId}/add`, {
    data: { siswa_akademik_ids: siswaAkademikIds }
  });
}

export async function removeAnggotaKegiatanEskul(anggotaId: string): Promise<void> {
  await requestWithFallback<void>('delete', `/attendance/anggota-kegiatan-eskul/member/${anggotaId}`);
}

