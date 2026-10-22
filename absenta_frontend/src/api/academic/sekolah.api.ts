import { requestWithFallback } from '../apiUtils';

export interface Sekolah {
  id: string;
  npsn: string;
  nama: string;
  alamat?: string;
  kota?: string;
  logo_url?: string;
  logo_daerah_url?: string;
  logo_daerah?: string;
  email?: string;
  telepon?: string;
  website?: string;
  kepala_sekolah?: string;
  nip_kepala?: string;
  nama_dinas_atas?: string;
  nama_dinas_bawah?: string;
  nama_cabang_dinas?: string;
  print_header_lines?: any[];
  sk_wali_kelas_template?: any;
}

export const sekolahApi = {
  getProfile: async () => {
    return requestWithFallback<Sekolah>('get', '/sekolah/me');
  },
  updateSKWaliKelasTemplate: async (pages: any[]) => {
    return requestWithFallback<Sekolah>('put', '/sekolah/me', {
      data: { sk_wali_kelas_template: pages },
    });
  },
};
