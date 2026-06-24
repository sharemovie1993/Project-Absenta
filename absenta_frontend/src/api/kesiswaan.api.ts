import api from '../lib/axiosInstance';

export interface JenisPrestasi {
  id: string;
  kategori: string;
  nama_prestasi: string;
  poin: number;
}

export interface PrestasiSiswa {
  id: string;
  siswa_id: string;
  tanggal: string;
  jenis_prestasi_id?: string;
  nama_prestasi: string;
  poin: number;
  keterangan?: string;
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  Jenis?: JenisPrestasi;
}

export interface Pelanggaran {
  id: string;
  siswa_id: string;
  jenis_pelanggaran: string;
  poin: number;
  keterangan: string;
  tanggal: string;
  status: string;
  Siswa?: {
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    }
  };
}

export interface JenisPelanggaran {
  id: string;
  kategori: string;
  nama_pelanggaran: string;
  poin: number;
}

export const kesiswaanApi = {
  getPelanggaran: async (params?: any) => {
    const response = await api.get('/kesiswaan/pelanggaran', { params });
    return response.data;
  },
  // Rekap harian seluruh siswa per kelas (bulk)
  // Endpoint benar: /attendance/rekap/kelas/:kelas_id/harian?tanggal=YYYY-MM-DD
  getRekapHarianSiswa: async (params?: { kelas_id?: string; tanggal?: string }) => {
    const kelasId = params?.kelas_id;
    if (!kelasId) throw new Error('kelas_id is required');
    const tanggal = params?.tanggal || new Date().toISOString().split('T')[0];
    const response = await api.get(`/attendance/rekap/kelas/${kelasId}/harian`, {
      params: { tanggal },
    });
    return response.data;
  },
  createPelanggaran: async (data: any) => {
    const response = await api.post('/kesiswaan/pelanggaran', data);
    return response.data;
  },
  updatePelanggaran: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/pelanggaran/${id}`, data);
    return response.data;
  },
  deletePelanggaran: async (id: string) => {
    const response = await api.delete(`/kesiswaan/pelanggaran/${id}`);
    return response.data;
  },

  // Jenis Pelanggaran (Master Data)
  getJenisPelanggaran: async () => {
    const response = await api.get('/kesiswaan/jenis-pelanggaran');
    return response.data;
  },
  createJenisPelanggaran: async (data: any) => {
    const response = await api.post('/kesiswaan/jenis-pelanggaran', data);
    return response.data;
  },
  updateJenisPelanggaran: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/jenis-pelanggaran/${id}`, data);
    return response.data;
  },
  deleteJenisPelanggaran: async (id: string) => {
    const response = await api.delete(`/kesiswaan/jenis-pelanggaran/${id}`);
    return response.data;
  },
  seedJenisPelanggaran: async () => {
    const response = await api.post('/kesiswaan/jenis-pelanggaran/seed', {});
    return response.data;
  },

  // === Jenis Prestasi ===
  getJenisPrestasi: async (): Promise<{ success: boolean; data: JenisPrestasi[] }> => {
    const response = await api.get('/kesiswaan/jenis-prestasi');
    return response.data;
  },
  createJenisPrestasi: async (data: any) => {
    const response = await api.post('/kesiswaan/jenis-prestasi', data);
    return response.data;
  },
  updateJenisPrestasi: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/jenis-prestasi/${id}`, data);
    return response.data;
  },
  deleteJenisPrestasi: async (id: string) => {
    const response = await api.delete(`/kesiswaan/jenis-prestasi/${id}`);
    return response.data;
  },

  // === Prestasi Siswa ===
  getPrestasiSiswa: async (params?: any): Promise<{ success: boolean; data: { list: PrestasiSiswa[]; pagination: any } }> => {
    const response = await api.get('/kesiswaan/prestasi', { params });
    return response.data;
  },
  createPrestasiSiswa: async (data: any) => {
    const response = await api.post('/kesiswaan/prestasi', data);
    return response.data;
  },
  updatePrestasiSiswa: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/prestasi/${id}`, data);
    return response.data;
  },
  deletePrestasiSiswa: async (id: string) => {
    const response = await api.delete(`/kesiswaan/prestasi/${id}`);
    return response.data;
  }
};
