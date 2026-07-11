import api from '../lib/axiosInstance';

export interface StrukturKurikulum {
  id: string;
  mapel_id: string;
  tahun_pelajaran_id: string;
  tingkat: number;
  jurusan_id?: string;
  jp_per_minggu: number;
  kelompok?: string;
  Mapel?: {
    nama_mapel: string;
    kode_mapel: string;
  };
  Jurusan?: {
    nama: string;
  };
}

export interface Supervisi {
  id: string;
  guru_id: string;
  tanggal: string;
  jam_ke?: number;
  kelas?: string;
  mapel?: string;
  catatan?: string;
  status: string;
  is_verified?: boolean;
  Guru?: {
    nama_guru: string;
    nip?: string;
  };
}

export const kurikulumApi = {
  // Struktur Kurikulum
  getStruktur: async (params?: any) => {
    const response = await api.get('/kurikulum/struktur', { params });
    return response.data;
  },
  upsertStruktur: async (data: any) => {
    const response = await api.post('/kurikulum/struktur', data);
    return response.data;
  },
  deleteStruktur: async (id: string) => {
    const response = await api.delete(`/kurikulum/struktur/${id}`);
    return response.data;
  },

  // Supervisi
  getSupervisi: async (params?: any) => {
    const response = await api.get('/kurikulum/supervisi', { params });
    return response.data;
  },
  createSupervisi: async (data: any) => {
    const response = await api.post('/kurikulum/supervisi', data);
    return response.data;
  },
  updateSupervisi: async (id: string, data: any) => {
    const response = await api.put(`/kurikulum/supervisi/${id}`, data);
    return response.data;
  },
  deleteSupervisi: async (id: string) => {
    const response = await api.delete(`/kurikulum/supervisi/${id}`);
    return response.data;
  },

  // Dashboard Monitoring
  getKbmGlobalMonitoring: async (tanggal?: string) => {
    // Pastikan tanggal dikirim dalam format YYYY-MM-DD murni tanpa konversi zona waktu yang salah
    const dateParam = tanggal || new Date().toISOString().split('T')[0];
    const response = await api.get('/dashboard/kurikulum/monitoring-global', {
      params: { tanggal: dateParam }
    });
    return response.data;
  },

  // Dashboard Stats (agregasi data dari berbagai endpoint untuk dashboard)
  getDashboardStats: async () => {
    const response = await api.get('/dashboard/kurikulum/stats');
    return response.data;
  },

  // Beban mengajar per guru (JP per minggu)
  getBebanMengajar: async (params?: { tahun_pelajaran_id?: string; semester_id?: string }) => {
    const response = await api.get('/kurikulum/struktur/beban-guru', { params });
    return response.data;
  },

  // Progress supervisi semester berjalan
  getProgressSupervisi: async () => {
    const response = await api.get('/kurikulum/supervisi/progress');
    return response.data;
  },

  // Perangkat Ajar / RPP
  getPerangkatAjar: async (params?: { guru_id?: string; mapel_id?: string; tahun_pelajaran_id?: string; semester_id?: string; status?: string; jenis?: string }) => {
    const response = await api.get('/kurikulum/perangkat', { params });
    return response.data;
  },
  uploadPerangkatAjar: async (data: { guru_id: string; mapel_id: string; tahun_pelajaran_id: string; semester_id: string; judul: string; jenis: string; file_url: string }) => {
    const response = await api.post('/kurikulum/perangkat', data);
    return response.data;
  },
  reviewPerangkatAjar: async (id: string, data: { status: 'APPROVED' | 'REJECTED'; catatan_reviewer?: string | null }) => {
    const response = await api.post(`/kurikulum/perangkat/${id}/review`, data);
    return response.data;
  },
  deletePerangkatAjar: async (id: string) => {
    const response = await api.delete(`/kurikulum/perangkat/${id}`);
    return response.data;
  },
};
