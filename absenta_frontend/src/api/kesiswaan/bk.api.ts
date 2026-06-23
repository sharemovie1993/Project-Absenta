import api from '../../lib/axiosInstance';

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

export interface KonselingSiswa {
  id: string;
  siswa_id: string;
  tanggal: string;
  tipe: 'INDIVIDU' | 'KELOMPOK';
  kelompok_id?: string;
  masalah: string;
  solusi?: string;
  status: 'PROSES' | 'SELESAI';
  petugas_id: string;
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  Petugas?: {
    id: string;
    full_name: string;
  };
}

export interface PemanggilanOrangTua {
  id: string;
  siswa_id: string;
  tanggal_pemanggilan: string;
  tanggal_pertemuan?: string;
  alasan: string;
  keterangan_pertemuan?: string;
  status: 'BARU' | 'DIKIRIM' | 'HADIR' | 'TIDAK_HADIR';
  surat_dokumen_id?: string;
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  Dokumen?: {
    id: string;
    judul: string;
    file_original_name: string;
  };
}

export interface HomeVisit {
  id: string;
  siswa_id: string;
  tanggal: string;
  alasan: string;
  hasil?: string;
  foto_dokumen_id?: string;
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  Dokumen?: {
    id: string;
    judul: string;
    file_original_name: string;
  };
}

export interface AsesmenSiswa {
  id: string;
  siswa_id: string;
  tanggal: string;
  nama_asesmen: string;
  hasil_skor?: string;
  keterangan?: string;
  dokumen_id?: string;
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  Dokumen?: {
    id: string;
    judul: string;
    file_original_name: string;
  };
}

export interface RujukanKasus {
  id: string;
  siswa_id: string;
  tanggal: string;
  rujukan_ke: string;
  alasan: string;
  status: 'DIUSULKAN' | 'SELESAI';
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
}

export interface BpbkDashboardStats {
  activeCounselingCount: number;
  pendingCallsCount: number;
  monthHomeVisitsCount: number;
  recentViolations: any[];
  recentCounselings: any[];
  criticalStudents: Array<{
    id: string;
    nama_siswa: string;
    nis: string;
    kelas: string;
    violations: number;
    achievements: number;
    netPoints: number;
  }>;
}

export const bkApi = {
  // === Dashboard BK Stats ===
  getDashboardStats: async (): Promise<{ success: boolean; data: BpbkDashboardStats }> => {
    const response = await api.get('/kesiswaan/bk/dashboard-stats');
    return response.data;
  },

  // === Jenis Prestasi ===
  getJenisPrestasi: async (): Promise<{ success: boolean; data: JenisPrestasi[] }> => {
    const response = await api.get('/kesiswaan/bk/jenis-prestasi');
    return response.data;
  },
  createJenisPrestasi: async (data: any) => {
    const response = await api.post('/kesiswaan/bk/jenis-prestasi', data);
    return response.data;
  },
  updateJenisPrestasi: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/bk/jenis-prestasi/${id}`, data);
    return response.data;
  },
  deleteJenisPrestasi: async (id: string) => {
    const response = await api.delete(`/kesiswaan/bk/jenis-prestasi/${id}`);
    return response.data;
  },

  // === Prestasi Siswa ===
  getPrestasiSiswa: async (params?: any): Promise<{ success: boolean; data: { list: PrestasiSiswa[]; pagination: any } }> => {
    const response = await api.get('/kesiswaan/bk/prestasi', { params });
    return response.data;
  },
  createPrestasiSiswa: async (data: any) => {
    const response = await api.post('/kesiswaan/bk/prestasi', data);
    return response.data;
  },
  updatePrestasiSiswa: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/bk/prestasi/${id}`, data);
    return response.data;
  },
  deletePrestasiSiswa: async (id: string) => {
    const response = await api.delete(`/kesiswaan/bk/prestasi/${id}`);
    return response.data;
  },

  // === Sesi Konseling ===
  getKonseling: async (params?: any): Promise<{ success: boolean; data: { list: KonselingSiswa[]; pagination: any } }> => {
    const response = await api.get('/kesiswaan/bk/konseling', { params });
    return response.data;
  },
  createKonseling: async (data: any) => {
    const response = await api.post('/kesiswaan/bk/konseling', data);
    return response.data;
  },
  updateKonseling: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/bk/konseling/${id}`, data);
    return response.data;
  },
  deleteKonseling: async (id: string) => {
    const response = await api.delete(`/kesiswaan/bk/konseling/${id}`);
    return response.data;
  },

  // === Pemanggilan Orang Tua ===
  getPemanggilan: async (params?: any): Promise<{ success: boolean; data: { list: PemanggilanOrangTua[]; pagination: any } }> => {
    const response = await api.get('/kesiswaan/bk/pemanggilan', { params });
    return response.data;
  },
  createPemanggilan: async (data: any) => {
    const response = await api.post('/kesiswaan/bk/pemanggilan', data);
    return response.data;
  },
  updatePemanggilan: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/bk/pemanggilan/${id}`, data);
    return response.data;
  },
  deletePemanggilan: async (id: string) => {
    const response = await api.delete(`/kesiswaan/bk/pemanggilan/${id}`);
    return response.data;
  },

  // === Home Visit ===
  getHomeVisits: async (params?: any): Promise<{ success: boolean; data: { list: HomeVisit[]; pagination: any } }> => {
    const response = await api.get('/kesiswaan/bk/home-visit', { params });
    return response.data;
  },
  createHomeVisit: async (data: any) => {
    const response = await api.post('/kesiswaan/bk/home-visit', data);
    return response.data;
  },
  updateHomeVisit: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/bk/home-visit/${id}`, data);
    return response.data;
  },
  deleteHomeVisit: async (id: string) => {
    const response = await api.delete(`/kesiswaan/bk/home-visit/${id}`);
    return response.data;
  },

  // === Asesmen Siswa ===
  getAsesmen: async (params?: any): Promise<{ success: boolean; data: { list: AsesmenSiswa[]; pagination: any } }> => {
    const response = await api.get('/kesiswaan/bk/asesmen', { params });
    return response.data;
  },
  createAsesmen: async (data: any) => {
    const response = await api.post('/kesiswaan/bk/asesmen', data);
    return response.data;
  },
  updateAsesmen: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/bk/asesmen/${id}`, data);
    return response.data;
  },
  deleteAsesmen: async (id: string) => {
    const response = await api.delete(`/kesiswaan/bk/asesmen/${id}`);
    return response.data;
  },

  // === Rujukan Kasus ===
  getRujukan: async (params?: any): Promise<{ success: boolean; data: { list: RujukanKasus[]; pagination: any } }> => {
    const response = await api.get('/kesiswaan/bk/rujukan', { params });
    return response.data;
  },
  createRujukan: async (data: any) => {
    const response = await api.post('/kesiswaan/bk/rujukan', data);
    return response.data;
  },
  updateRujukan: async (id: string, data: any) => {
    const response = await api.put(`/kesiswaan/bk/rujukan/${id}`, data);
    return response.data;
  },
  deleteRujukan: async (id: string) => {
    const response = await api.delete(`/kesiswaan/bk/rujukan/${id}`);
    return response.data;
  }
};
