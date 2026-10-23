import { requestWithFallback } from '../apiUtils';

export const bukuIndukQueryKeys = {
  all: ['buku-induk'] as const,
  lists: () => [...bukuIndukQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...bukuIndukQueryKeys.lists(), filters] as const,
  detail: (id: string) => [...bukuIndukQueryKeys.all, 'detail', id] as const,
  klapper: (filters: Record<string, any>) => [...bukuIndukQueryKeys.all, 'klapper', filters] as const,
};

// Types
export interface BukuIndukListItem {
  id: string;
  nis: string;
  nama_siswa: string;
  nisn?: string;
  status: string;
  gender?: string;
  tanggal_masuk?: string;
  foto_url?: string;
  Kelas?: { id: string; nama_kelas: string; tingkat: number };
  TahunPelajaran?: { id: string; tahun: string };
  Semester?: { id: string; nama_semester: string };
}

export interface BukuIndukPaginatedResponse {
  success: boolean;
  data: BukuIndukListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface BukuIndukDetailResponse {
  success: boolean;
  data: any; // rich 360° profile
}

export interface KlapperListItem {
  id: string;
  nis: string;
  nama_siswa: string;
  nisn?: string;
  status: string;
  tanggal_masuk?: string;
  Kelas?: { id: string; nama_kelas: string; tingkat: number };
  klapperNo?: number;
}

export interface KlapperPaginatedResponse {
  success: boolean;
  data: KlapperListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const bukuIndukApi = {
  getList: async (params: {
    tahun_pelajaran_id?: string;
    kelas_id?: string;
    angkatan?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<BukuIndukPaginatedResponse> => {
    return requestWithFallback<BukuIndukPaginatedResponse>('get', '/academic/buku-induk-klapper/buku-induk', { params });
  },

  getDetail: async (siswaId: string): Promise<BukuIndukDetailResponse> => {
    return requestWithFallback<BukuIndukDetailResponse>('get', `/academic/buku-induk-klapper/buku-induk/${siswaId}`);
  },

  getKlapper: async (params: {
    tahun_pelajaran_id?: string;
    kelas_id?: string;
    jurusan_id?: string;
    tingkat?: string;
    angkatan?: string;
    status?: string;
    search?: string;
    huruf?: string;
    page?: number;
    limit?: number;
  }): Promise<KlapperPaginatedResponse> => {
    return requestWithFallback<KlapperPaginatedResponse>('get', '/academic/buku-induk-klapper/buku-klapper', { params });
  },
};
