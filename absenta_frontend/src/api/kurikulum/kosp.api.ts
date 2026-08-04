import { apiUtils } from '../apiUtils';

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
    return apiUtils.get<{ success: boolean; data: KospConfigData | null }>(
      `/kurikulum/kosp-config?tahun_pelajaran_id=${tahunPelajaranId}`
    );
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
    return apiUtils.put<{ success: boolean; data: KospConfigData }>(
      '/kurikulum/kosp-config',
      payload
    );
  },
};
