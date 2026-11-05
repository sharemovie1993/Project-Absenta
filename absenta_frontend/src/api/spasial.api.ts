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
  try {
    const res = await api.get('/sarpras/denah', { params });
    return res.data?.data || [];
  } catch (err: any) {
    if (err?.response?.status === 403) {
      const res = await api.get('/cbt/denah', { params });
      return res.data?.data || [];
    }
    throw err;
  }
}

export async function fetchDenahDetail(id: string): Promise<DenahSpasial> {
  try {
    const res = await api.get(`/sarpras/denah/${id}`);
    return res.data?.data;
  } catch (err: any) {
    if (err?.response?.status === 403) {
      const res = await api.get(`/cbt/denah/${id}`);
      return res.data?.data;
    }
    throw err;
  }
}

export async function createDenah(data: CreateDenahDTO): Promise<DenahSpasial> {
  try {
    const res = await api.post('/sarpras/denah', data);
    return res.data?.data;
  } catch (err: any) {
    if (err?.response?.status === 403) {
      const res = await api.post('/cbt/denah', data);
      return res.data?.data;
    }
    throw err;
  }
}

export async function updateDenah(
  id: string,
  data: UpdateDenahDTO
): Promise<DenahSpasial> {
  try {
    const res = await api.put(`/sarpras/denah/${id}`, data);
    return res.data?.data;
  } catch (err: any) {
    if (err?.response?.status === 403) {
      const res = await api.put(`/cbt/denah/${id}`, data);
      return res.data?.data;
    }
    throw err;
  }
}

export async function deleteDenah(id: string): Promise<void> {
  try {
    await api.delete(`/sarpras/denah/${id}`);
  } catch (err: any) {
    if (err?.response?.status === 403) {
      await api.delete(`/cbt/denah/${id}`);
      return;
    }
    throw err;
  }
}

export async function cloneDenah(
  id: string,
  data: { nama_denah: string; tipe: TipeDenah; event_cbt_id?: string | null }
): Promise<DenahSpasial> {
  try {
    const res = await api.post(`/sarpras/denah/${id}/clone`, data);
    return res.data?.data;
  } catch (err: any) {
    if (err?.response?.status === 403) {
      const res = await api.post(`/cbt/denah/${id}/clone`, data);
      return res.data?.data;
    }
    throw err;
  }
}
