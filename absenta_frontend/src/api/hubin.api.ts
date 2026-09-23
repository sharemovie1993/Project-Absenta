import { requestWithFallback } from './apiUtils';
import { importDataFromExcel } from '../utils/import.utils';

export interface MitraIndustri {
  id: string;
  nama: string;
  logo_url?: string | null;
  bidang?: string;
  alamat?: string;
  kontak?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  
  // Detail PIC Industri
  pic_nama?: string;
  pic_jabatan?: string;
  pic_telepon?: string;
  pic_email?: string;

  // MoU & Kuota
  mou_nomor?: string;
  mou_url?: string;
  mou_tanggal_mulai?: string;
  mou_tanggal_berakhir?: string;
  mou_status?: string;
  kuota_pkl?: number;
  kompetensi_keahlian?: string;
  _count?: {
    SiswaPkl?: number;
  };
}

export interface HubinMoUHistory {
  id: string;
  mitra_id: string;
  mou_nomor: string;
  mou_tipe: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  mou_url?: string;
  keterangan?: string;
}

export interface HubinLowongan {
  id: string;
  mitra_id?: string;
  perusahaan_nama: string;
  judul_posisi: string;
  deskripsi: string;
  persyaratan: string;
  kuota: number;
  tanggal_tutup: string;
  status: 'BUKA' | 'TUTUP';
  Mitra?: {
    nama: string;
    alamat?: string;
  };
}

export interface HubinLamaran {
  id: string;
  lowongan_id: string;
  siswa_id: string;
  status_seleksi: 'TERKIRIM' | 'PROSES' | 'INTERVIEW' | 'DITERIMA' | 'DITOLAK';
  cv_url?: string;
  catatan?: string;
  created_at: string;
  Lowongan?: {
    judul_posisi: string;
    perusahaan_nama: string;
  };
  Siswa?: {
    nama_siswa: string;
    nis: string;
    no_hp?: string | null;
    User?: {
      email: string;
    } | null;
  };
  Logs?: HubinLamaranLog[];
}

export interface HubinLamaranLog {
  id: string;
  lamaran_id: string;
  status_dari?: string | null;
  status_ke: string;
  catatan?: string | null;
  interview_tanggal?: string | null;
  interview_lokasi?: string | null;
  interview_link?: string | null;
  interview_pesan?: string | null;
  interview_narahubung?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface HubinTracerStudy {
  id: string;
  siswa_id: string;
  tahun_lulus: number;
  status_alumni: 'BEKERJA' | 'KULIAH' | 'WIRAUSAHA' | 'MENCARI_KERJA';
  perusahaan_nama?: string;
  posisi?: string;
  gaji_estimasi?: string;
  universitas_nama?: string;
  program_studi?: string;
  usaha_nama?: string;
  usaha_bidang?: string;
  keselarasan?: 'SANGAT_SESUAI' | 'SESUAI' | 'TIDAK_SESUAI' | string;
  masa_tunggu?: string;
  no_wa?: string;
  created_at?: string;
  Siswa?: {
    nama_siswa: string;
    nis: string;
    jurusan_id?: string;
    Kelas?: {
      nama_kelas?: string;
      Jurusan?: {
        id?: string;
        nama?: string;
        nama_jurusan?: string;
        singkatan?: string;
      };
    };
    Jurusan?: {
      id?: string;
      nama?: string;
      nama_jurusan?: string;
      singkatan?: string;
    };
  };
}

export interface HubinTefaOrder {
  id: string;
  mitra_id?: string;
  nama_proyek: string;
  nilai_kontrak?: number;
  status_proyek: 'PERENCANAAN' | 'BERJALAN' | 'SELESAI' | 'BATAL';
  tanggal_mulai?: string;
  tanggal_target?: string;
  deskripsi?: string;
  Mitra?: {
    nama: string;
  };
}

export interface SiswaPkl {
  id: string;
  siswa_id: string;
  mitra_id: string;
  tanggal_mulai: string;
  tanggal_selesai?: string;
  status: string;
  pembimbing_id?: string;
  lat_override?: number | null;
  lon_override?: number | null;
  radius_override?: number | null;
  is_flexible_location?: boolean;
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
  latitude_masuk?: number;
  longitude_masuk?: number;
  latitude_pulang?: number;
  longitude_pulang?: number;
  is_outside_radius?: boolean;
  distance_meters?: number;
  address_snapshot?: string;
  is_verified: boolean;
}


export const hubinApi = {
  // Mitra
  getMitra: (params?: { search?: string; page?: number; limit?: number; mou_status?: string }) => 
    requestWithFallback<any>('get', '/hubin/mitra', { params }),
  getMitraList: (params?: { search?: string; page?: number; limit?: number; mou_status?: string }) => 
    requestWithFallback<any>('get', '/hubin/mitra', { params }),
  createMitra: (data: Partial<MitraIndustri>) => requestWithFallback<any>('post', '/hubin/mitra', { data }),
  updateMitra: (id: string, data: Partial<MitraIndustri>) => requestWithFallback<any>('put', `/hubin/mitra/${id}`, { data }),
  deleteMitra: (id: string) => requestWithFallback<any>('delete', `/hubin/mitra/${id}`),
  importMitraFromExcel: (file: File, onProgress?: (percent: number) => void, socketId?: string) =>
    importDataFromExcel('/hubin/mitra/import', file, onProgress, socketId),

  // Penempatan
  getPenempatan: (params?: { search?: string; page?: number; limit?: number; tahun_pelajaran_id?: string; semester_id?: string; status?: string; mitra_id?: string; pembimbing_id?: string; kelas_id?: string }) => 
    requestWithFallback<any>('get', '/hubin/penempatan', { params }),
  getMyPenempatan: () => requestWithFallback<any>('get', '/hubin/penempatan/me'),
  createPenempatan: (data: any) => requestWithFallback<any>('post', '/hubin/penempatan', { data }),
  updatePenempatan: (id: string, data: any) => requestWithFallback<any>('put', `/hubin/penempatan/${id}`, { data }),
  mutasiPenempatan: (id: string, data: {
    tanggal_selesai_lama?: string;
    mitra_id_baru: string;
    pembimbing_id_baru?: string;
    tanggal_mulai_baru: string;
    tanggal_selesai_baru?: string;
    catatan_mutasi?: string;
  }) => requestWithFallback<any>('post', `/hubin/penempatan/${id}/mutasi`, { data }),
  bulkUpdateStatus: (data: { ids: string[]; status: string; tanggal_selesai_aktual?: string }) =>
    requestWithFallback<any>('post', '/hubin/penempatan/bulk-status', { data }),
  bulkCreatePenempatan: (data: any) => requestWithFallback<any>('post', '/hubin/penempatan/bulk', { data }),
  updatePenilaian: (id: string, nilai: any) => requestWithFallback<any>('put', `/hubin/penempatan/${id}/nilai`, { data: { nilai } }),
  addKunjungan: (id: string, data: any) => requestWithFallback<any>('post', `/hubin/penempatan/${id}/kunjungan`, { data }),
  updateKunjungan: (id: string, kunjunganId: string, data: any) => requestWithFallback<any>('put', `/hubin/penempatan/${id}/kunjungan/${kunjunganId}`, { data }),
  deleteKunjungan: (id: string, kunjunganId: string) => requestWithFallback<any>('delete', `/hubin/penempatan/${id}/kunjungan/${kunjunganId}`),
  deletePenempatan: (id: string) => requestWithFallback<any>('delete', `/hubin/penempatan/${id}`),
  submitJurnalPortofolio: (id: string, file_url: string) => requestWithFallback<any>('post', `/hubin/penempatan/${id}/jurnal-akhir`, { data: { file_url } }),
  reviewJurnalPortofolio: (id: string, status: string, catatan: string) => requestWithFallback<any>('put', `/hubin/penempatan/${id}/jurnal-akhir/review`, { data: { status, catatan } }),

  // Assessment & Sertifikat PKL
  upsertNilaiPklBatch: (payload: { scores: any[]; tahun_pelajaran_id?: string; semester_id?: string } | any[]) => {
    const data = Array.isArray(payload) ? { scores: payload } : payload;
    return requestWithFallback<any>('post', '/hubin/penempatan/nilai-batch', { data });
  },
  getRekapPklSiswa: (params?: { 
    kelas_id?: string; 
    status?: string; 
    search?: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
    pembimbing_id?: string;
  }) => requestWithFallback<any>('get', '/hubin/penempatan/rekap', { params }),
  upsertSettingDeskripsiPkl: (data: { mitra_id: string; jurusan_id?: string; deskripsi_tp: string }) => requestWithFallback<any>('post', '/hubin/deskripsi-tp', { data }),
  getSettingDeskripsiPklList: (params?: { mitra_id?: string }) => requestWithFallback<any>('get', '/hubin/deskripsi-tp', { params }),
  getSertifikatPklData: (id: string) => requestWithFallback<any>('get', `/hubin/sertifikat/${id}`),

  // Absensi
  getAbsensi: (siswaPklId: string, params?: { page?: number; limit?: number }) => 
    requestWithFallback<any>('get', `/hubin/absensi/${siswaPklId}`, { params }),
  checkIn: (data: { siswaPklId: string; latitude: number; longitude: number; kegiatan?: string; image_url?: string }) => 
    requestWithFallback<any>('post', '/hubin/absensi/check-in', { data }),
  checkOut: (data: { siswaPklId: string; latitude: number; longitude: number; kegiatan?: string; image_url?: string }) => 
    requestWithFallback<any>('post', '/hubin/absensi/check-out', { data }),
  updateLogbook: (siswaPklId: string, kegiatan: string, absensiId?: string, image_url?: string) => 
    requestWithFallback<any>('put', `/hubin/absensi/${siswaPklId}/logbook`, { data: { kegiatan, absensiId, image_url } }),
  submitIzinSakitPkl: (data: { siswaPklId: string; status: 'SAKIT' | 'IZIN'; tanggal_mulai: string; tanggal_selesai?: string; keterangan: string; image_url?: string }) =>
    requestWithFallback<any>('post', '/hubin/absensi/izin-sakit', { data }),
  verifyAbsensi: (id: string) => requestWithFallback<any>('put', `/hubin/absensi/${id}/verify`),

  // Stats
  getStats: () => requestWithFallback<any>('get', '/dashboard/hubin/stats'),

  // Settings & Source of Truth Referensi Hubin
  getSettings: (params?: { tahun_pelajaran_id?: string }) => requestWithFallback<{ 
    folderUrl: string; 
    driveMode: string;
    assessmentMode?: 'DUDI_ONLY' | 'COMPOSITE';
    weightDudi?: number;
    weightLaporan?: number;
    weightSidang?: number;
    tahun_pelajaran_id?: string | null;
    nomorSuratSertifikat?: string;
    tanggalTerbitSertifikat?: string;
    durasiJp?: string | number;
    tempatTerbit?: string;
    penandatanganNama?: string;
    penandatanganNip?: string;
  }>('get', '/hubin/settings', { params, unwrapData: true }),
  updateSettings: (data: { 
    folderUrl?: string; 
    driveMode?: string;
    assessmentMode?: 'DUDI_ONLY' | 'COMPOSITE';
    weightDudi?: number;
    weightLaporan?: number;
    weightSidang?: number;
    tahun_pelajaran_id?: string;
    nomorSuratSertifikat?: string;
    tanggalTerbitSertifikat?: string;
    durasiJp?: string | number;
    tempatTerbit?: string;
    penandatanganNama?: string;
    penandatanganNip?: string;
  }) => requestWithFallback<any>('put', '/hubin/settings', { data, unwrapData: true }),
  deletePhoto: (url: string) => requestWithFallback<any>('delete', '/hubin/upload', { data: { url } }),

  // MoU History
  getMoUHistory: (mitraId: string) => requestWithFallback<any>('get', `/hubin/mitra/${mitraId}/mou`),
  createMoUHistory: (mitraId: string, data: any) => requestWithFallback<any>('post', `/hubin/mitra/${mitraId}/mou`, { data }),
  deleteMoUHistory: (id: string) => requestWithFallback<any>('delete', `/hubin/mou/${id}`),
  generateMoUPdf: (data: {
    title?: string;
    description?: string;
    tanggal?: string;
    nomor?: string;
    pihak_kedua_nama?: string;
    pihak_kedua_alamat?: string;
  }) => requestWithFallback<any>('post', '/documents/mou', { data }),

  // BKK Lowongan
  getLowongan: (params?: { search?: string; status?: string; page?: number; limit?: number }) => 
    requestWithFallback<any>('get', '/hubin/bkk/lowongan', { params }),
  createLowongan: (data: Partial<HubinLowongan>) => requestWithFallback<any>('post', '/hubin/bkk/lowongan', { data }),
  updateLowongan: (id: string, data: Partial<HubinLowongan>) => requestWithFallback<any>('put', `/hubin/bkk/lowongan/${id}`, { data }),
  deleteLowongan: (id: string) => requestWithFallback<any>('delete', `/hubin/bkk/lowongan/${id}`),

  // BKK Lamaran
  getLamaran: (params?: { lowonganId?: string; status?: string; siswaId?: string; page?: number; limit?: number }) => 
    requestWithFallback<any>('get', '/hubin/bkk/lamaran', { params }),
  createLamaran: (data: Partial<HubinLamaran>) => requestWithFallback<any>('post', '/hubin/bkk/lamaran', { data }),
  updateLamaranStatus: (id: string, status: string, catatan?: string) => 
    requestWithFallback<any>('put', `/hubin/bkk/lamaran/${id}/status`, { data: { status, catatan } }),
  scheduleInterview: (id: string, data: { tanggal: string; lokasi?: string; link?: string; pesan?: string; narahubung?: string }) =>
    requestWithFallback<any>('post', `/hubin/bkk/lamaran/${id}/interview`, { data }),
  getLamaranTimeline: (id: string) =>
    requestWithFallback<any>('get', `/hubin/bkk/lamaran/${id}/timeline`),
  deleteLamaran: (id: string) =>
    requestWithFallback<any>('delete', `/hubin/bkk/lamaran/${id}`),

  // Tracer Study
  getTracerStudy: (params?: { search?: string; tahunLulus?: number; statusAlumni?: string; page?: number; limit?: number }) => 
    requestWithFallback<any>('get', '/hubin/tracer', { params }),
  submitTracerStudy: (data: Partial<HubinTracerStudy>) => requestWithFallback<any>('post', '/hubin/tracer', { data }),
  getTracerStats: () => requestWithFallback<any>('get', '/hubin/tracer/stats'),

  // TEFA
  getTefaOrders: (params?: { search?: string; statusProyek?: string; page?: number; limit?: number }) => 
    requestWithFallback<any>('get', '/hubin/tefa', { params }),
  createTefaOrder: (data: Partial<HubinTefaOrder>) => requestWithFallback<any>('post', '/hubin/tefa', { data }),
  updateTefaOrder: (id: string, data: Partial<HubinTefaOrder>) => requestWithFallback<any>('put', `/hubin/tefa/${id}`, { data }),
  deleteTefaOrder: (id: string) => requestWithFallback<any>('delete', `/hubin/tefa/${id}`),

  // Activity Feed
  getRecentActivity: () => requestWithFallback<any>('get', '/hubin/activity/recent'),
};
