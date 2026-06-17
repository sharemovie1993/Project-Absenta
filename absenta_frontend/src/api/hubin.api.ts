import { requestWithFallback } from './apiUtils';

export interface MitraIndustri {
  id: string;
  nama: string;
  bidang?: string;
  alamat?: string;
  kontak?: string;
  mou_url?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface SiswaPkl {
  id: string;
  siswa_id: string;
  mitra_id: string;
  tanggal_mulai: string;
  tanggal_selesai?: string;
  status: string;
  pembimbing_id?: string;
  Siswa: { 
    nama_siswa: string; 
    nis: string; 
    no_hp?: string | null;
    Kelas?: {
      nama_kelas: string;
    };
  };
  Mitra: { 
    nama: string;
    alamat?: string;
  };
  Pembimbing?: { 
    nama_guru: string;
    no_hp?: string;
  };
  nilai_json?: any;
  kunjungan_json?: any;
  jurnal_json?: {
    file_url: string;
    status: 'MENUNGGU_REVIEW' | 'DISETUJUI' | 'REVISI';
    submitted_at: string;
    catatan_revisi?: string;
    reviewed_at?: string;
  };
}

export interface AbsensiPkl {
  id: string;
  tanggal: string;
  jam_masuk?: string;
  jam_pulang?: string;
  status: string;
  kegiatan?: string;
  image_url?: string;
  image_url_out?: string;
  is_verified: boolean;
}

export const hubinApi = {
  // Mitra
  getMitra: (params?: { search?: string; page?: number; limit?: number }) => 
    requestWithFallback<any>('get', '/hubin/mitra', { params }),
  createMitra: (data: Partial<MitraIndustri>) => requestWithFallback<any>('post', '/hubin/mitra', { data }),
  updateMitra: (id: string, data: Partial<MitraIndustri>) => requestWithFallback<any>('put', `/hubin/mitra/${id}`, { data }),
  deleteMitra: (id: string) => requestWithFallback<any>('delete', `/hubin/mitra/${id}`),

  // Penempatan
  getPenempatan: (params?: { search?: string; page?: number; limit?: number }) => 
    requestWithFallback<any>('get', '/hubin/penempatan', { params }),
  getMyPenempatan: () => requestWithFallback<any>('get', '/hubin/penempatan/me'),
  createPenempatan: (data: any) => requestWithFallback<any>('post', '/hubin/penempatan', { data }),
  updatePenilaian: (id: string, nilai: any) => requestWithFallback<any>('put', `/hubin/penempatan/${id}/nilai`, { data: { nilai } }),
  addKunjungan: (id: string, data: any) => requestWithFallback<any>('post', `/hubin/penempatan/${id}/kunjungan`, { data }),
  deletePenempatan: (id: string) => requestWithFallback<any>('delete', `/hubin/penempatan/${id}`),
  submitJurnalPortofolio: (id: string, file_url: string) => requestWithFallback<any>('post', `/hubin/penempatan/${id}/jurnal-akhir`, { data: { file_url } }),
  reviewJurnalPortofolio: (id: string, status: string, catatan: string) => requestWithFallback<any>('put', `/hubin/penempatan/${id}/jurnal-akhir/review`, { data: { status, catatan } }),

  // Absensi
  getAbsensi: (siswaPklId: string, params?: { page?: number; limit?: number }) => 
    requestWithFallback<any>('get', `/hubin/absensi/${siswaPklId}`, { params }),
  checkIn: (data: { siswaPklId: string; latitude: number; longitude: number; kegiatan?: string; image_url?: string }) => 
    requestWithFallback<any>('post', '/hubin/absensi/check-in', { data }),
  checkOut: (data: { siswaPklId: string; latitude: number; longitude: number; kegiatan?: string; image_url?: string }) => 
    requestWithFallback<any>('post', '/hubin/absensi/check-out', { data }),
  updateLogbook: (siswaPklId: string, kegiatan: string, absensiId?: string, image_url?: string) => 
    requestWithFallback<any>('put', `/hubin/absensi/${siswaPklId}/logbook`, { data: { kegiatan, absensiId, image_url } }),
  verifyAbsensi: (id: string) => requestWithFallback<any>('put', `/hubin/absensi/${id}/verify`),

  // Stats
  getStats: () => requestWithFallback<any>('get', '/dashboard/hubin/stats'),

  // Settings
  getSettings: () => requestWithFallback<{ folderUrl: string; driveMode: string }>('get', '/hubin/settings'),
  updateSettings: (data: { folderUrl: string; driveMode: string }) => requestWithFallback<any>('put', '/hubin/settings', { data }),
  deletePhoto: (url: string) => requestWithFallback<any>('delete', '/hubin/upload', { data: { url } }),
};
