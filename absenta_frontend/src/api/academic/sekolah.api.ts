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
}

export const sekolahApi = {
  getProfile: async () => {
    return requestWithFallback<Sekolah>('get', '/sekolah/me');
  },
};
