import { requestWithFallback } from './apiUtils';
import type {
  Guru, Siswa, Kelas, Mapel, TahunPelajaran, Semester,
  CreateGuruData, UpdateGuruData,
  CreateSiswaData, UpdateSiswaData,
  CreateKelasData, UpdateKelasData,
  CreateMapelData, UpdateMapelData,
  CreateTahunPelajaranData, UpdateTahunPelajaranData,
  CreateSemesterData, UpdateSemesterData,
  CreateJurusanData, UpdateJurusanData, Jurusan,
  AcademicApiResponse, AcademicListResponse, AcademicQueryParams
} from '../types/academic';

// Guru API
export const guruApi = {
  getAll: async (params?: AcademicQueryParams): Promise<AcademicListResponse<Guru>> => {
    const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
    return requestWithFallback<AcademicListResponse<Guru>>(
      'get',
      '/academic/guru',
      { params: q, headers: { 'X-Skip-403-Redirect': 'true' } }
    );
  },

  getById: async (id: string): Promise<AcademicApiResponse<Guru>> => {
    return requestWithFallback<AcademicApiResponse<Guru>>('get', `/academic/guru/${id}`);
  },

  getMe: async (): Promise<AcademicApiResponse<Guru>> => {
    return requestWithFallback<AcademicApiResponse<Guru>>('get', '/academic/guru/me');
  },

  create: async (data: CreateGuruData): Promise<AcademicApiResponse<Guru>> => {
    return requestWithFallback<AcademicApiResponse<Guru>>('post', '/academic/guru', { data });
  },

  update: async (id: string, data: UpdateGuruData): Promise<AcademicApiResponse<Guru>> => {
    return requestWithFallback<AcademicApiResponse<Guru>>('put', `/academic/guru/${id}`, { data });
  },

  delete: async (id: string): Promise<AcademicApiResponse<void>> => {
    return requestWithFallback<AcademicApiResponse<void>>('delete', `/academic/guru/${id}`);
  }
};

// Siswa API
export const siswaApi = {
  getAll: async (params?: AcademicQueryParams): Promise<AcademicListResponse<Siswa>> => {
    const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
    if (q && Array.isArray(q.search_fields)) {
      q.search_fields = q.search_fields.join(',');
    }
    return requestWithFallback<AcademicListResponse<Siswa>>(
      'get',
      '/academic/siswa',
      { params: q, headers: { 'X-Skip-403-Redirect': 'true' } }
    );
  },

  getById: async (id: string): Promise<AcademicApiResponse<Siswa>> => {
    return requestWithFallback<AcademicApiResponse<Siswa>>('get', `/academic/siswa/${id}`);
  },

  create: async (data: CreateSiswaData): Promise<AcademicApiResponse<Siswa>> => {
    return requestWithFallback<AcademicApiResponse<Siswa>>('post', '/academic/siswa', { data });
  },

  update: async (id: string, data: UpdateSiswaData): Promise<AcademicApiResponse<Siswa>> => {
    return requestWithFallback<AcademicApiResponse<Siswa>>('put', `/academic/siswa/${id}`, { data });
  },

  delete: async (id: string): Promise<AcademicApiResponse<void>> => {
    return requestWithFallback<AcademicApiResponse<void>>('delete', `/academic/siswa/${id}`);
  },

  generateRfid: async (id: string): Promise<{ success: boolean; message: string; data?: { id: string; no_rfid: string } }> => {
    return requestWithFallback<{ success: boolean; message: string; data?: { id: string; no_rfid: string } }>('post', `/academic/siswa/${id}/rfid/generate`);
  },

  generateRfidBulk: async (params?: { kelas_id?: string }): Promise<{ success: boolean; message: string; data?: { updated: number } }> => {
    const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
    return requestWithFallback<{ success: boolean; message: string; data?: { updated: number } }>('post', '/academic/siswa/rfid/generate-bulk', { data: null, params: q });
  }
};

// Universal Search API
export const academicSearchApi = {
  universalSearch: async (q: string, limit: number = 15): Promise<AcademicApiResponse<any[]>> => {
    return requestWithFallback<AcademicApiResponse<any[]>>(
      'get',
      '/academic/universal-search',
      { params: { q, limit } }
    );
  }
};

// Kelas API
export const kelasApi = {
  getAll: async (params?: AcademicQueryParams): Promise<AcademicListResponse<Kelas>> => {
    const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
    return requestWithFallback<AcademicListResponse<Kelas>>('get', '/academic/kelas', { params: q });
  },

  getById: async (id: string): Promise<AcademicApiResponse<Kelas>> => {
    return requestWithFallback<AcademicApiResponse<Kelas>>('get', `/academic/kelas/${id}`);
  },

  create: async (data: CreateKelasData): Promise<AcademicApiResponse<Kelas>> => {
    return requestWithFallback<AcademicApiResponse<Kelas>>('post', '/academic/kelas', { data });
  },

  update: async (id: string, data: UpdateKelasData): Promise<AcademicApiResponse<Kelas>> => {
    return requestWithFallback<AcademicApiResponse<Kelas>>('put', `/academic/kelas/${id}`, { data });
  },

  delete: async (id: string): Promise<AcademicApiResponse<void>> => {
    return requestWithFallback<AcademicApiResponse<void>>('delete', `/academic/kelas/${id}`);
  }
};

// Mapel API
export const mapelApi = {
  getAll: async (params?: AcademicQueryParams): Promise<AcademicListResponse<Mapel>> => {
    const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
    return requestWithFallback<AcademicListResponse<Mapel>>(
      'get',
      '/academic/mapel',
      { params: q, headers: { 'X-Skip-403-Redirect': 'true' } }
    );
  },

  getById: async (id: string): Promise<AcademicApiResponse<Mapel>> => {
    return requestWithFallback<AcademicApiResponse<Mapel>>('get', `/academic/mapel/${id}`);
  },

  getByTingkat: async (tingkat: number): Promise<AcademicListResponse<Mapel>> => {
    return requestWithFallback<AcademicListResponse<Mapel>>(
      'get',
      `/academic/mapel/tingkat/${tingkat}`,
      { headers: { 'X-Skip-403-Redirect': 'true' } }
    );
  },

  create: async (data: CreateMapelData): Promise<AcademicApiResponse<Mapel>> => {
    return requestWithFallback<AcademicApiResponse<Mapel>>('post', '/academic/mapel', { data });
  },

  update: async (id: string, data: UpdateMapelData): Promise<AcademicApiResponse<Mapel>> => {
    return requestWithFallback<AcademicApiResponse<Mapel>>('put', `/academic/mapel/${id}`, { data });
  },

  delete: async (id: string): Promise<AcademicApiResponse<void>> => {
    return requestWithFallback<AcademicApiResponse<void>>('delete', `/academic/mapel/${id}`);
  }
};

// Tahun Pelajaran API
export const tahunPelajaranApi = {
  getAll: async (params?: AcademicQueryParams): Promise<AcademicListResponse<TahunPelajaran>> => {
    const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
    return requestWithFallback<AcademicListResponse<TahunPelajaran>>('get', '/academic/tahun-pelajaran', { params: q });
  },

  getById: async (id: string): Promise<AcademicApiResponse<TahunPelajaran>> => {
    return requestWithFallback<AcademicApiResponse<TahunPelajaran>>('get', `/academic/tahun-pelajaran/${id}`);
  },

  getActive: async (): Promise<AcademicApiResponse<TahunPelajaran>> => {
    return requestWithFallback<AcademicApiResponse<TahunPelajaran>>('get', '/academic/tahun-pelajaran/active');
  },

  create: async (data: CreateTahunPelajaranData): Promise<AcademicApiResponse<TahunPelajaran>> => {
    return requestWithFallback<AcademicApiResponse<TahunPelajaran>>('post', '/academic/tahun-pelajaran', { data });
  },

  update: async (id: string, data: UpdateTahunPelajaranData): Promise<AcademicApiResponse<TahunPelajaran>> => {
    return requestWithFallback<AcademicApiResponse<TahunPelajaran>>('put', `/academic/tahun-pelajaran/${id}`, { data });
  },

  delete: async (id: string): Promise<AcademicApiResponse<void>> => {
    return requestWithFallback<AcademicApiResponse<void>>('delete', `/academic/tahun-pelajaran/${id}`);
  }
};

// Semester API
export const semesterApi = {
  getAll: async (params?: AcademicQueryParams): Promise<AcademicListResponse<Semester>> => {
    const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
    return requestWithFallback<AcademicListResponse<Semester>>('get', '/academic/semester', { params: q });
  },

  getById: async (id: string): Promise<AcademicApiResponse<Semester>> => {
    return requestWithFallback<AcademicApiResponse<Semester>>('get', `/academic/semester/${id}`);
  },

  getActive: async (): Promise<AcademicApiResponse<Semester>> => {
    return requestWithFallback<AcademicApiResponse<Semester>>('get', '/academic/semester/active');
  },

  create: async (data: CreateSemesterData): Promise<AcademicApiResponse<Semester>> => {
    return requestWithFallback<AcademicApiResponse<Semester>>('post', '/academic/semester', { data });
  },

  update: async (id: string, data: UpdateSemesterData): Promise<AcademicApiResponse<Semester>> => {
    return requestWithFallback<AcademicApiResponse<Semester>>('put', `/academic/semester/${id}`, { data });
  },

  delete: async (id: string): Promise<AcademicApiResponse<void>> => {
    return requestWithFallback<AcademicApiResponse<void>>('delete', `/academic/semester/${id}`);
  }
};

// Jurusan API
export const jurusanApi = {
  getAll: async (params?: AcademicQueryParams): Promise<AcademicListResponse<Jurusan>> => {
    const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
    return requestWithFallback<AcademicListResponse<Jurusan>>('get', '/academic/jurusan', { params: q });
  },
  create: async (data: CreateJurusanData): Promise<AcademicApiResponse<Jurusan>> => {
    return requestWithFallback<AcademicApiResponse<Jurusan>>('post', '/academic/jurusan', { data });
  },
  update: async (id: string, data: UpdateJurusanData): Promise<AcademicApiResponse<Jurusan>> => {
    return requestWithFallback<AcademicApiResponse<Jurusan>>('put', `/academic/jurusan/${id}`, { data });
  },
  delete: async (id: string): Promise<AcademicApiResponse<void>> => {
    return requestWithFallback<AcademicApiResponse<void>>('delete', `/academic/jurusan/${id}`);
  }
};

// Legacy exports for backward compatibility (if needed)
export const getCourseList = guruApi.getAll;
export const getStudentList = siswaApi.getAll;
export const getCourseById = guruApi.getById;
export const getStudentById = siswaApi.getById;

// Utility functions
export const formatStatusBadge = (status: string): { color: string; label: string } => {
  switch (status.toUpperCase()) {
    case 'AKTIF':
      return { color: 'bg-green-100 text-green-800', label: 'Aktif' };
    case 'NONAKTIF':
      return { color: 'bg-red-100 text-red-800', label: 'Non-Aktif' };
    case 'LULUS':
      return { color: 'bg-blue-100 text-blue-800', label: 'Lulus' };
    case 'PINDAH':
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Pindah' };
    default:
      return { color: 'bg-gray-100 text-gray-800', label: status };
  }
};

export const formatTingkatLabel = (tingkat: number): string => {
  switch (tingkat) {
    case 1: return 'Kelas 1';
    case 2: return 'Kelas 2';
    case 3: return 'Kelas 3';
    case 4: return 'Kelas 4';
    case 5: return 'Kelas 5';
    case 6: return 'Kelas 6';
    case 7: return 'Kelas 7';
    case 8: return 'Kelas 8';
    case 9: return 'Kelas 9';
    case 10: return 'Kelas 10';
    case 11: return 'Kelas 11';
    case 12: return 'Kelas 12';
    default: return `Tingkat ${tingkat}`;
  }
};
