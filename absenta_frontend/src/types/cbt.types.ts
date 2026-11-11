export type CbtBankStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CbtJadwalStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type CbtPesertaStatus = 'STANDBY' | 'IN_PROGRESS' | 'FINISHED' | 'DISQUALIFIED';

export interface OpsiJawaban {
  kode: 'A' | 'B' | 'C' | 'D' | 'E';
  teks: string;
  gambar_url?: string | null;
}

export interface CbtUnitPengajaranSummary {
  id: string;
  nama_unit: string;
  kode_unit?: string | null;
  guru_id?: string | null;
  Guru?: {
    id: string;
    nama_guru: string;
    nip?: string | null;
  } | null;
}

export interface CbtBankSoalKontributor {
  id: string;
  bank_soal_id: string;
  guru_id: string;
  unit_pengajaran_id?: string | null;
  peran?: 'KOORDINATOR' | 'KONTRIBUTOR' | string;
  can_edit_soal?: boolean;
  Guru?: {
    id: string;
    nama_guru: string;
    nip?: string | null;
  } | null;
  UnitPengajaran?: {
    id: string;
    nama_unit: string;
    kode_unit?: string | null;
  } | null;
}

export interface CbtBankContributorsResponse {
  bank_soal_id: string;
  contributors: CbtBankSoalKontributor[];
  eligible_units: CbtUnitPengajaranSummary[];
  delegated_teachers: Array<{
    guru_id: string;
    nama_guru: string;
    nip?: string | null;
    unit_pengajaran_id?: string | null;
    nama_unit?: string | null;
  }>;
}

export interface CbtSoal {
  id: string;
  tenant_id?: string;
  bank_soal_id: string;
  unit_pengajaran_id?: string | null;
  nomor_urut: number;
  jenis_soal: 'PG';
  konten_pertanyaan: string;
  gambar_stimulus_url?: string | null;
  bobot: number;
  opsi_jawaban_json: OpsiJawaban[];
  kunci_jawaban: 'A' | 'B' | 'C' | 'D' | 'E';
  pembahasan?: string | null;
  created_at?: string;
  updated_at?: string;
  UnitPengajaran?: CbtUnitPengajaranSummary | null;
}

export interface CbtBankSoal {
  id: string;
  tenant_id?: string;
  guru_id: string;
  mapel_id: string;
  tahun_pelajaran_id?: string | null;
  semester_id?: string | null;
  unit_pengajaran_id?: string | null;
  kode_bank: string;
  judul: string;
  tingkat: 'X' | 'XI' | 'XII' | 'SEMUA';
  jurusan?: string | null;
  jumlah_soal: number;
  alokasi_menit: number;
  acak_soal: boolean;
  acak_opsi: boolean;
  status: CbtBankStatus;
  is_shared?: boolean;
  created_at?: string;
  updated_at?: string;
  Guru?: {
    id: string;
    nama_guru: string;
    nip?: string | null;
  };
  Mapel?: {
    id: string;
    nama_mapel: string;
    kode_mapel: string;
    teaching_mode?: 'SINGLE' | 'COLLABORATION';
  };
  UnitPengajaran?: CbtUnitPengajaranSummary | null;
  Kontributor?: CbtBankSoalKontributor[];
  is_kolaborasi_mapel?: boolean;
  is_kolaborasi_resmi?: boolean;
  is_kuis_unit?: boolean;
  display_mapel?: string;
  kolaborasi_badge?: string | null;
  available_units?: CbtUnitPengajaranSummary[];
  contributor_guru_ids?: string[];
  contributors?: Array<{
    guru_id: string;
    unit_pengajaran_id?: string | null;
    peran?: string;
    can_edit_soal?: boolean;
  }>;
  auto_sync_kolaborasi?: boolean;
  _count?: {
    Soal: number;
    JadwalUjian: number;
  };
}

export type CbtRaporSlot = 'sumatif_1' | 'sumatif_2' | 'sumatif_3' | 'sumatif_4' | 'sumatif_akhir';

export interface CbtSettingKeamanan {
  lock_device?: boolean;
  block_tab_switching?: boolean;
  max_tab_switches?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_result_instant?: boolean;
  auto_transfer_rapor?: boolean;
  target_rapor_slot?: CbtRaporSlot | null;
  created_by_guru_id?: string | null;
  ruang_ujian?: string | null;
  pengawas_1_id?: string | null;
  pengawas_1_nama?: string | null;
  pengawas_1_nip?: string | null;
  pengawas_2_id?: string | null;
  pengawas_2_nama?: string | null;
  pengawas_2_nip?: string | null;
  proktor_id?: string | null;
  proktor_nama?: string | null;
  proktor_nip?: string | null;
}

export interface CbtJadwalUjian {
  id: string;
  tenant_id?: string;
  bank_soal_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  nama_sesi: string;
  token_ujian: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  durasi_menit: number;
  toleransi_terlambat_menit: number;
  status: CbtJadwalStatus;
  target_kelas_ids: string[];
  setting_keamanan?: CbtSettingKeamanan;
  created_at?: string;
  updated_at?: string;
  BankSoal?: CbtBankSoal;
  TahunPelajaran?: {
    id?: string;
    tahun: string;
  };
  Semester?: {
    id?: string;
    nama_semester: string;
  };
  _count?: {
    Peserta: number;
  };
  display_mapel?: string;
  kolaborasi_badge?: string | null;
  is_kolaborasi?: boolean;
}

export interface CbtPesertaUnitScore {
  unit_pengajaran_id: string;
  nama_unit: string;
  guru_nama?: string | null;
  benar: number;
  total_soal: number;
  bobot_diperoleh: number;
  bobot_total: number;
  skor: number;
}

export interface CbtPesertaUjian {
  id: string;
  tenant_id?: string;
  jadwal_ujian_id: string;
  siswa_id: string;
  token_masuk: string;
  waktu_mulai?: string | null;
  waktu_selesai?: string | null;
  sisa_waktu_detik: number;
  durasi_pengerjaan_detik?: number;
  status: CbtPesertaStatus;
  status_sinkron: string;
  jawaban_json?: Array<{
    soal_id: string;
    jawaban_siswa: string;
    is_ragu: boolean;
    timestamp: number;
  }>;
  jumlah_benar: number;
  jumlah_salah: number;
  nilai_akhir: number;
  log_pelanggaran_json?: Array<{
    waktu: string;
    tipe_pelanggaran: string;
    detail?: string;
  }>;
  metadata_perangkat?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  Siswa?: {
    id: string;
    nama_lengkap: string;
    nis: string;
    nisn?: string | null;
    Kelas?: {
      id: string;
      nama_kelas: string;
    } | null;
  };
  unit_scores?: CbtPesertaUnitScore[];
}

export interface CbtStudentAnswerItem {
  soal_id: string;
  jawaban_siswa: string;
  is_ragu: boolean;
  timestamp: number;
}

export type CbtStudentExamStatus = 'BELUM_MULAI' | 'STANDBY' | 'IN_PROGRESS' | 'FINISHED' | 'DISQUALIFIED';

export interface CbtStudentExamItem {
  id: string;
  nama_sesi: string;
  mapel: string;
  mapel_induk?: string;
  unit_pengajaran_id?: string | null;
  unit_nama?: string | null;
  is_kolaborasi?: boolean;
  kolaborasi_badge?: string | null;
  kode_mapel?: string | null;
  kode_bank?: string | null;
  judul_bank: string;
  tingkat?: string | null;
  tahun_ajaran?: string | null;
  semester?: string | null;
  guru: string | null;
  total_soal: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  durasi_menit: number;
  status_jadwal: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  is_remedial?: boolean;
  is_tokenless?: boolean;
  token_ujian?: string | null;
  nama_sesi_waktu?: string | null;
  ruang_ujian?: string | null;
  ruang_ujian_nama?: string | null;
  status_peserta: CbtStudentExamStatus;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  durasi_pengerjaan_menit?: number | null;
  jumlah_terjawab?: number;
  pelanggaran_count?: number;
  hasil: {
    nilai_akhir: number;
    jumlah_benar: number;
    jumlah_salah: number;
  } | null;
}

export interface CbtTransferNilaiPayload {
  target_slot: CbtRaporSlot;
  tahun_pelajaran_id: string;
  semester_id: string;
  mapel_id?: string;
  kelas_ids?: string[];
  overwrite_existing?: boolean;
  round_integer?: boolean;
}

export interface CbtTransferNilaiResponse {
  transferred_count: number;
  skipped_count: number;
  total_finished: number;
  target_slot: CbtRaporSlot;
  mapel_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
}

export interface CbtEventItem {
  id: string;
  tahun_pelajaran_id: string;
  nama_event: string;
  kode_event: string;
  semester: 'GANJIL' | 'GENAP';
  target_tingkat: number[];
  tipe_pelaksanaan?: 'MASSAL' | 'MANDIRI';
  keterangan?: string;
  lock_teacher_scheduling: boolean;
  token_refresh_interval?: number;
  strict_browser_guard: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CbtTpEventsSummary {
  tahun_pelajaran_id: string;
  tahun_ajaran: string;
  is_active_tp: boolean;
  events: CbtEventItem[];
}

