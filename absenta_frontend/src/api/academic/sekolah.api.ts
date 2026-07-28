import { requestWithFallback } from '../apiUtils';

export interface Sekolah {
  id: string;
  npsn: string;
  nama: string;
  alamat?: string;
  logo_url?: string;
  email?: string;
  telepon?: string;
  website?: string;
  kepala_sekolah?: string;
  nip_kepala?: string;
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
