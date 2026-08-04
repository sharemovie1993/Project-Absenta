import api from '../../lib/axiosInstance';

export interface KospConfigData {
  id?: string;
  tenant_id?: string;
  tahun_pelajaran_id: string;
  visi?: string;
  misi?: string;
  karakteristik?: string;
  halaman_html?: string;
  config?: string;
  created_at?: string;
  updated_at?: string;
}

export const kospApi = {
  /**
   * Mengambil kustomisasi KOSP per tahun pelajaran
   */
  getConfigByTahun: async (tahunPelajaranId: string) => {
    const res = await api.get<{ success: boolean; data: KospConfigData | null }>(
      `/kurikulum/kosp-config?tahun_pelajaran_id=${tahunPelajaranId}`
    );
    return res.data;
  },

  /**
   * Menyimpan kustomisasi KOSP per tahun pelajaran
   */
  upsertConfig: async (payload: {
    tahun_pelajaran_id: string;
    visi?: string;
    misi?: string;
    karakteristik?: string;
    halaman_html?: string;
    config?: string;
  }) => {
    const res = await api.put<{ success: boolean; data: KospConfigData }>(
      '/kurikulum/kosp-config',
      payload
    );
    return res.data;
  },
};
