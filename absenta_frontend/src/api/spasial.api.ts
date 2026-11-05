import api from '../lib/axiosInstance';
import type {
  DenahSpasial,
  CreateDenahDTO,
  UpdateDenahDTO,
  TipeDenah,
} from '../types/spasial.types';

export const spasialQueryKeys = {
  all: ['spasial'] as const,
  list: (params?: Record<string, any>) =>
    params !== undefined
      ? ([...spasialQueryKeys.all, 'list', params] as const)
      : ([...spasialQueryKeys.all, 'list'] as const),
  detail: (id?: string) =>
    id !== undefined
      ? ([...spasialQueryKeys.all, 'detail', id] as const)
      : ([...spasialQueryKeys.all, 'detail'] as const),
};

export async function fetchDenahList(params?: {
  tipe?: TipeDenah;
  event_cbt_id?: string;
  gedung?: string;
  lantai?: number;
}): Promise<DenahSpasial[]> {
  const res = await api.get('/sarpras/denah', { params });
  return res.data?.data || [];
}

export async function fetchDenahDetail(id: string): Promise<DenahSpasial> {
  const res = await api.get(`/sarpras/denah/${id}`);
  return res.data?.data;
}

export async function createDenah(data: CreateDenahDTO): Promise<DenahSpasial> {
  const res = await api.post('/sarpras/denah', data);
  return res.data?.data;
}

export async function updateDenah(
  id: string,
  data: UpdateDenahDTO
): Promise<DenahSpasial> {
  const res = await api.put(`/sarpras/denah/${id}`, data);
  return res.data?.data;
}

export async function deleteDenah(id: string): Promise<void> {
  await api.delete(`/sarpras/denah/${id}`);
}

export async function cloneDenah(
  id: string,
  data: { nama_denah: string; tipe: TipeDenah; event_cbt_id?: string | null }
): Promise<DenahSpasial> {
  const res = await api.post(`/sarpras/denah/${id}/clone`, data);
  return res.data?.data;
}
