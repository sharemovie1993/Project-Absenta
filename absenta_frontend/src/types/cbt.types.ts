export type CbtBankStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CbtJadwalStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type CbtPesertaStatus = 'STANDBY' | 'IN_PROGRESS' | 'FINISHED' | 'DISQUALIFIED';

export interface OpsiJawaban {
  kode: 'A' | 'B' | 'C' | 'D' | 'E';
  teks: string;
  gambar_url?: string | null;
}

export interface CbtSoal {
  id: string;
  tenant_id?: string;
  bank_soal_id: string;
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
}

export interface CbtBankSoal {
  id: string;
  tenant_id?: string;
  guru_id: string;
  mapel_id: string;
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
  };
  _count?: {
    Soal: number;
    JadwalUjian: number;
  };
}

export type CbtRaporSlot = 'sumatif_1' | 'sumatif_2' | 'sumatif_3' | 'sumatif_akhir';

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
  status_jadwal: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
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
