import axiosInstance from '../lib/axiosInstance';
import { standardApiCall } from './apiUtils';

export interface PublicSchoolProfile {
  id: string;
  nama: string;
  npsn: string | null;
  jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK' | string;
  akreditasi: string | null;
  kurikulum: string | null;
  alamat: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kota: string | null;
  provinsi: string | null;
  kode_pos: string | null;
  telepon: string | null;
  email: string | null;
  website: string | null;
  kepala_sekolah: string | null;
  nip_kepala: string | null;
  logo_url: string | null;
  tahun_berdiri: number | null;
  subdomain: string | null;
  custom_domain: string | null;
  stats: {
    total_siswa: number;
    total_guru: number;
    total_jurusan: number;
    total_mitra_industri: number;
    total_fasilitas: number;
  };
  web_config: {
    theme_color: string;
    hero_title: string;
    hero_subtitle: string;
    hero_images: string[];
    sambutan_kepsek: string | null;
    foto_kepsek: string | null;
    visi: string | null;
    misi: string[];
    social_links: {
      instagram?: string;
      facebook?: string;
      youtube?: string;
      tiktok?: string;
    };
    ppdb_active: boolean;
    ppdb_url?: string;
    ppdb_announcement?: string;
    graduation_announce_active: boolean;
    graduation_announce_date?: string | null;
    tefa_whatsapp?: string | null;
  };
}

export interface PublicStaffMember {
  id: string;
  nama_guru: string;
  nip: string | null;
  foto: string | null;
  jenis_kelamin: string | null;
  jabatan: string | null;
  pendidikan_terakhir: string | null;
  jenis_ptk: string;
  mata_pelajaran: string[];
}

export interface PublicProgram {
  id: string;
  nama: string;
  kode: string | null;
  singkatan: string | null;
  warna: string | null;
  logo_url: string | null;
  program_keahlian: string | null;
  durasi_jurusan: string | null;
  jumlah_kelas: number;
}

export interface PublicAchievement {
  id: string;
  nama_prestasi: string;
  kategori: string;
  tanggal: string;
  keterangan: string | null;
  nama_siswa: string;
  nama_kelas: string | null;
}

export interface PublicTracerStats {
  total_alumni: number;
  bekerja_count: number;
  kuliah_count: number;
  wirausaha_count: number;
  mencari_kerja_count: number;
  bekerja_pct: number;
  kuliah_pct: number;
  wirausaha_pct: number;
  serapan_total_pct: number;
  highlight_destinations: Array<{
    nama_alumni: string;
    tahun_lulus: number;
    status: string;
    instansi: string;
    posisi_atau_prodi: string;
  }>;
}

export interface PublicPklDistribution {
  total_siswa_pkl_aktif: number;
  total_dudi_aktif: number;
  placements: Array<{
    mitra_id: string;
    nama_mitra: string;
    bidang: string | null;
    alamat: string | null;
    kompetensi_keahlian: string | null;
    jumlah_siswa: number;
    kuota_pkl: number;
  }>;
}

export interface PublicHubinData {
  mitra: Array<{
    id: string;
    nama: string;
    bidang: string | null;
    logo_url: string | null;
    kompetensi_keahlian: string | null;
    alamat: string | null;
  }>;
  lowongan: Array<{
    id: string;
    perusahaan_nama: string;
    judul_posisi: string;
    deskripsi: string;
    persyaratan: string;
    kuota: number;
    tanggal_tutup: string;
  }>;
  tefa_projects: Array<{
    id: string;
    nama_proyek: string;
    deskripsi: string | null;
    status_proyek: string;
    nilai_kontrak: number | null;
    mitra_nama: string | null;
  }>;
  tracer_study?: PublicTracerStats;
  pkl_distribution?: PublicPklDistribution;
}

export interface PublicFacility {
  id: string;
  nama: string;
  deskripsi: string | null;
  unit_jurusan: string | null;
  image_url: string | null;
}

export interface PublicArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  author_name: string;
  published_at: string;
  event_date: string | null;
  views_count: number;
}

export interface PublicArticleDetail extends PublicArticleSummary {
  content: string;
}

export interface DocumentVerificationResult {
  valid: boolean;
  jenis_dokumen: string;
  nomor_dokumen: string;
  nama_siswa: string;
  nisn: string | null;
  kelas?: string;
  predikat?: string;
  status_kelulusan?: string;
  mitra_penguji?: string;
  tanggal_terbit?: string;
  tanggal_lulus?: string;
}

export interface PublicLivePulse {
  tanggal: string;
  tahun_ajaran: string;
  semester: string;
  indeks_kehadiran_siswa: number;
  indeks_kehadiran_guru: number;
  sesi_kbm_terlaksana_pct: number;
  status_pembiasaan_pagi: string;
  agenda_hari_ini: string;
  total_rombel_aktif: number;
}

export interface PublicCalendarEvent {
  id: string;
  judul: string;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  keterangan: string | null;
}

export interface PublicEkskulItem {
  id: string;
  nama: string;
  tipe: string;
  jadwal_hari: string[];
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  jumlah_anggota: number;
}

export interface PublicCalendarAndEkskul {
  tahun_ajaran: string;
  calendar: PublicCalendarEvent[];
  ekskul: PublicEkskulItem[];
}

export interface PublicGraduationResult {
  found: boolean;
  is_open: boolean;
  release_date: string | null;
  message?: string;
  data?: {
    nama_siswa: string;
    nis: string;
    nisn: string | null;
    kelas: string | null;
    jurusan: string | null;
    nomor_skl: string;
    status_kelulusan: string;
    rata_rata_nilai: number;
    tanggal_lulus: string;
    catatan: string | null;
  };
}

export interface PublicGuestBookTicket {
  ticket_code: string;
  nama_tamu: string;
  instansi_tamu: string;
  keperluan_tamu: string;
  pejabat_dituju: string;
  waktu_akses: string;
  kategori_buku: string;
}

export interface PublicCurriculumSubject {
  id: string;
  nama_mapel: string;
  kode_mapel: string | null;
  tingkat: number;
  kelompok: string;
  jp_per_minggu: number;
  jurusan_id: string | null;
  nama_jurusan: string | null;
}

export interface PublicP5ProjectItem {
  id: string;
  judul: string;
  deskripsi: string | null;
  tahun_ajaran: string;
  semester: string;
  jumlah_fasilitator: number;
  dimensi_fokus: string[];
}

export interface PublicCurriculumAndP5 {
  tahun_ajaran: string;
  karakteristik_kosp: string | null;
  subjects: PublicCurriculumSubject[];
  p5_projects: PublicP5ProjectItem[];
}

export interface PublicClassScheduleSlot {
  id: string;
  hari: string;
  slot_index: number;
  jam_mulai: string;
  jam_selesai: string;
  nama_mapel: string;
  nama_guru: string;
  nama_ruangan: string | null;
  jenis_kegiatan: string;
}

export interface PublicScheduleOverview {
  tahun_ajaran: string;
  semester: string;
  classes: Array<{
    id: string;
    nama_kelas: string;
    tingkat: number;
    nama_jurusan: string | null;
  }>;
  rooms: Array<{
    id: string;
    nama_ruangan: string;
    kode_ruangan: string | null;
    jenis_ruangan: string;
    kapasitas: number;
  }>;
  selected_class_id: string | null;
  schedules: PublicClassScheduleSlot[];
}

export interface PublicPpidDocument {
  id: string;
  nomor_dokumen: string;
  judul: string;
  kategori: string;
  ringkasan: string | null;
  tanggal_publikasi: string;
  file_url: string | null;
  ukuran_info: string;
}

export interface PublicAspirasiTicket {
  ticket_code: string;
  kategori: string;
  pengirim: string;
  tanggal: string;
  status: string;
  pesan_konfirmasi: string;
}

export interface PublicOrgMember {
  id: string;
  jabatan: string;
  kategori_jabatan: 'PIMPINAN' | 'WAKASEK' | 'KAPROG' | 'KOORDINATOR' | 'WALAS';
  nama_pejabat: string;
  nip: string | null;
  foto: string | null;
  unit_kerja: string | null;
  urutan: number;
}

export interface PublicSpatialMap {
  id: string;
  nama_denah: string;
  gedung: string;
  lantai: string;
  canvas_width: number;
  canvas_height: number;
  rooms: Array<{
    id: string;
    label: string;
    type: string;
    capacity: number | null;
    color: string;
    zone: string;
  }>;
}

export interface PublicELibraryModule {
  id: string;
  judul: string;
  mata_pelajaran: string;
  tingkat: number;
  fase: string;
  kategori: string;
  ringkasan: string;
  penulis: string;
  alokasi_jp: number;
  tags: string[];
  file_url: string | null;
}

export interface PublicCoopProduct {
  id: string;
  kode: string;
  nama_produk: string;
  kategori: string;
  harga: number;
  satuan: string;
  stok_status: 'TERSEDIA' | 'TERBATAS' | 'PRE_ORDER';
  deskripsi: string | null;
  image_url: string | null;
}

export interface PublicWave4Ecosystem {
  org_structure: PublicOrgMember[];
  spatial_maps: PublicSpatialMap[];
  elibrary_modules: PublicELibraryModule[];
  coop_catalog: PublicCoopProduct[];
}

export interface PublicTicketTrackResult {
  found: boolean;
  ticket_code: string;
  jenis_layanan: string;
  nama_pemohon: string;
  unit_tujuan: string;
  tanggal_pengajuan: string;
  status_terkini: string;
  tahapan: Array<{
    label: string;
    waktu: string;
    selesai: boolean;
  }>;
  catatan_tindak_lanjut: string;
}

export const publicPortalApi = {
  getProfile: (slug: string) =>
    standardApiCall<{ success: boolean; data: PublicSchoolProfile }>(
      () => axiosInstance.get(`/public/portal/${slug}/profile`),
      'publicPortalApi.getProfile'
    ),

  getEcosystem: (slug: string) =>
    standardApiCall<{ success: boolean; data: PublicWave4Ecosystem }>(
      () => axiosInstance.get(`/public/portal/${slug}/ecosystem`),
      'publicPortalApi.getEcosystem'
    ),

  trackTicket: (slug: string, code: string) =>
    standardApiCall<{ success: boolean; data: PublicTicketTrackResult }>(
      () => axiosInstance.get(`/public/portal/${slug}/track-ticket/${encodeURIComponent(code)}`),
      'publicPortalApi.trackTicket'
    ),

  getLivePulse: (slug: string) =>
    standardApiCall<{ success: boolean; data: PublicLivePulse }>(
      () => axiosInstance.get(`/public/portal/${slug}/live-pulse`),
      'publicPortalApi.getLivePulse'
    ),

  getCalendarAndEkskul: (slug: string) =>
    standardApiCall<{ success: boolean; data: PublicCalendarAndEkskul }>(
      () => axiosInstance.get(`/public/portal/${slug}/calendar-ekskul`),
      'publicPortalApi.getCalendarAndEkskul'
    ),

  getCurriculumAndP5: (slug: string) =>
    standardApiCall<{ success: boolean; data: PublicCurriculumAndP5 }>(
      () => axiosInstance.get(`/public/portal/${slug}/curriculum-p5`),
      'publicPortalApi.getCurriculumAndP5'
    ),

  getClassSchedule: (slug: string, kelasId?: string) =>
    standardApiCall<{ success: boolean; data: PublicScheduleOverview }>(
      () => axiosInstance.get(`/public/portal/${slug}/class-schedule`, { params: kelasId ? { kelas_id: kelasId } : undefined }),
      'publicPortalApi.getClassSchedule'
    ),

  getPublicDocuments: (slug: string) =>
    standardApiCall<{ success: boolean; data: PublicPpidDocument[]; count: number }>(
      () => axiosInstance.get(`/public/portal/${slug}/ppid-docs`),
      'publicPortalApi.getPublicDocuments'
    ),

  getStaff: (slug: string, query?: { jenis_ptk?: string; search?: string }) =>
    standardApiCall<{ success: boolean; data: PublicStaffMember[]; count: number }>(
      () => axiosInstance.get(`/public/portal/${slug}/staff`, { params: query }),
      'publicPortalApi.getStaff'
    ),

  getPrograms: (slug: string) =>
    standardApiCall<{ success: boolean; data: PublicProgram[]; count: number }>(
      () => axiosInstance.get(`/public/portal/${slug}/programs`),
      'publicPortalApi.getPrograms'
    ),

  getAchievements: (slug: string, limit = 12) =>
    standardApiCall<{ success: boolean; data: PublicAchievement[]; count: number }>(
      () => axiosInstance.get(`/public/portal/${slug}/achievements`, { params: { limit } }),
      'publicPortalApi.getAchievements'
    ),

  getHubin: (slug: string) =>
    standardApiCall<{ success: boolean; data: PublicHubinData }>(
      () => axiosInstance.get(`/public/portal/${slug}/hubin`),
      'publicPortalApi.getHubin'
    ),

  getFacilities: (slug: string) =>
    standardApiCall<{ success: boolean; data: PublicFacility[]; count: number }>(
      () => axiosInstance.get(`/public/portal/${slug}/facilities`),
      'publicPortalApi.getFacilities'
    ),

  getArticles: (slug: string, params?: { category?: string; page?: number; limit?: number; search?: string }) =>
    standardApiCall<{ success: boolean; data: PublicArticleSummary[]; total: number; page: number; total_pages: number }>(
      () => axiosInstance.get(`/public/portal/${slug}/articles`, { params }),
      'publicPortalApi.getArticles'
    ),

  getArticleDetail: (slug: string, articleSlug: string) =>
    standardApiCall<{ success: boolean; data: PublicArticleDetail }>(
      () => axiosInstance.get(`/public/portal/${slug}/articles/${articleSlug}`),
      'publicPortalApi.getArticleDetail'
    ),

  verifyDocument: (slug: string, docType: string, code: string) =>
    standardApiCall<{ success: boolean; data: DocumentVerificationResult }>(
      () => axiosInstance.get(`/public/portal/${slug}/verify/${docType}/${encodeURIComponent(code)}`),
      'publicPortalApi.verifyDocument'
    ),

  checkGraduation: (slug: string, nisnOrNis: string) =>
    standardApiCall<{ success: boolean; data: PublicGraduationResult }>(
      () => axiosInstance.post(`/public/portal/${slug}/graduation-check`, { nisn: nisnOrNis }),
      'publicPortalApi.checkGraduation'
    ),

  submitGuestBook: (
    slug: string,
    payload: {
      nama_tamu: string;
      instansi_tamu?: string;
      keperluan_tamu: string;
      kontak_tamu?: string;
      pejabat_dituju?: string;
      kategori_buku?: string;
      jabatan_tamu?: string;
      nomor_surat_tugas?: string;
      pesan_kesan?: string;
    }
  ) =>
    standardApiCall<{ success: boolean; data: PublicGuestBookTicket; message: string }>(
      () => axiosInstance.post(`/public/portal/${slug}/guestbook`, payload),
      'publicPortalApi.submitGuestBook'
    ),

  submitAspirasi: (
    slug: string,
    payload: {
      nama_pengirim?: string;
      peran_pengirim?: string;
      kategori_aspirasi: string;
      isi_laporan: string;
      is_anonim?: boolean;
    }
  ) =>
    standardApiCall<{ success: boolean; data: PublicAspirasiTicket; message: string }>(
      () => axiosInstance.post(`/public/portal/${slug}/aspirasi`, payload),
      'publicPortalApi.submitAspirasi'
    ),

  // ── CMS Management API (Admin & Humas) ──
  saveWebConfig: (data: any) =>
    standardApiCall<{ success: boolean; message: string }>(
      () => axiosInstance.post('/public/portal/manage/config', data),
      'publicPortalApi.saveWebConfig'
    ),

  createArticle: (data: any) =>
    standardApiCall<{ success: boolean; data: any; message: string }>(
      () => axiosInstance.post('/public/portal/manage/articles', data),
      'publicPortalApi.createArticle'
    ),

  updateArticle: (id: string, data: any) =>
    standardApiCall<{ success: boolean; data: any; message: string }>(
      () => axiosInstance.put(`/public/portal/manage/articles/${id}`, data),
      'publicPortalApi.updateArticle'
    ),

  deleteArticle: (id: string) =>
    standardApiCall<{ success: boolean; message: string }>(
      () => axiosInstance.delete(`/public/portal/manage/articles/${id}`),
      'publicPortalApi.deleteArticle'
    ),
};
