import api from '../lib/axiosInstance';

export interface IzinKeluarSiswa {
  id: string;
  tenant_id: string;
  siswa_akademik_id: string;
  guru_piket_id?: string | null;
  jam_keluar: string;
  jam_kembali?: string | null;
  alasan: string;
  tipe_izin: 'IZIN_KELUAR' | 'PULANG_AWAL' | 'IZIN_JURUSAN' | string;
  status: 'DISETUJUI' | 'KEMBALI' | 'TERLAMBAT' | string;
  created_at: string;
  updated_at: string;
  SiswaAkademik?: {
    id: string;
    siswa: {
      nama_siswa: string;
      nis: string;
      no_rfid?: string | null;
      foto_url?: string | null;
    };
    kelas?: {
      nama_kelas: string;
    } | null;
  } | null;
  GuruPiket?: {
    nama_guru: string;
  } | null;
}

export const piketApi = {
  getDailyPermits: async (params?: { date?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; data: IzinKeluarSiswa[] }> => {
    const response = await api.get('/kesiswaan/piket', {
      params
    });
    return response.data;
  },

  createPermit: async (data: {
    siswa_akademik_id: string;
    guru_piket_id?: string;
    alasan: string;
    tipe_izin: string;
    jam_keluar: string; // ISO date string
  }): Promise<{ success: boolean; data: IzinKeluarSiswa }> => {
    const response = await api.post('/kesiswaan/piket', data);
    return response.data;
  },

  markReturned: async (id: string): Promise<{ success: boolean; data: IzinKeluarSiswa }> => {
    const response = await api.patch(`/kesiswaan/piket/${id}/kembali`);
    return response.data;
  },

  deletePermit: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/kesiswaan/piket/${id}`);
    return response.data;
  }
};
