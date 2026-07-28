import { requestWithFallback } from '../apiUtils';

export interface SKWaliKelasArsip {
  id: string;
  tenant_id: string;
  guru_id: string;
  nama_guru: string;
  nama_kelas: string;
  tahun_pelajaran: string;
  nomor_sk?: string;
  tanggal_sk?: string;
  halaman_html?: any;
  dicetak_oleh: string;
  created_at: string;
}

export const skWaliKelasArsipApi = {
  saveArsip: async (payload: {
    guru_id: string;
    nama_guru: string;
    nama_kelas: string;
    tahun_pelajaran: string;
    nomor_sk?: string;
    tanggal_sk?: string;
    halaman_html: any;
  }) => {
    return requestWithFallback<SKWaliKelasArsip>('post', '/kurikulum/wali-kelas/sk-arsip', {
      data: payload,
    });
  },

  getArsipList: async (params?: { tahun_pelajaran?: string; guru_id?: string; search?: string }) => {
    return requestWithFallback<SKWaliKelasArsip[]>('get', '/kurikulum/wali-kelas/sk-arsip', {
      params,
    });
  },

  getArsipById: async (id: string) => {
    return requestWithFallback<SKWaliKelasArsip>('get', `/kurikulum/wali-kelas/sk-arsip/${id}`);
  },

  deleteArsip: async (id: string) => {
    return requestWithFallback('delete', `/kurikulum/wali-kelas/sk-arsip/${id}`);
  },
};
