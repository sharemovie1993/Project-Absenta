import { PlenoDecisionType, PlenoTriageZone } from '@prisma/client';

export interface CreateSessionDTO {
  tahun_pelajaran_id: string;
  semester_id: string;
  title: string;
  date: string; // ISO Date string
  start_time: string; // e.g. "08:30"
  end_time?: string;
  location: string;
  description?: string;
  quorum_target?: number;
  leader_user_id?: string;
  secretary_user_id?: string;
}

export interface UpdateSessionDTO {
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  quorum_target?: number;
  leader_user_id?: string;
  secretary_user_id?: string;
  closing_notes?: string;
}

export interface TapAttendanceDTO {
  user_id: string;
  role_in_meeting?: string;
  is_present?: boolean;
  signature_url?: string;
  notes?: string;
}

export interface DecideStudentDTO {
  keputusan_akhir: PlenoDecisionType;
  target_kelas_id?: string;
  alasan_keputusan?: string;
  catatan_pendampingan?: string;
  mutasi_sekolah_tujuan?: string;
  mutasi_no_surat?: string;
  mutasi_tanggal?: string;
  is_disputed?: boolean;
  voted_by_consensus?: boolean;
  voting_yes?: number;
  voting_no?: number;
}

export interface CreateMinuteDTO {
  rombel_id?: string;
  speaker_name?: string;
  speaker_role?: string;
  topic: string;
  content: string;
  action_item?: string;
}

export interface StudentDossier360 {
  siswa: {
    id: string;
    nis: string;
    nisn?: string | null;
    nama_lengkap: string;
    jenis_kelamin: string;
    kelas_nama?: string;
    foto?: string | null;
  };
  triage: {
    zone: PlenoTriageZone;
    reasons: string[];
    rekomendasi_awal: PlenoDecisionType;
  };
  decision?: {
    id: string;
    keputusan_akhir: PlenoDecisionType;
    target_kelas_id?: string | null;
    alasan_keputusan?: string | null;
    catatan_pendampingan?: string | null;
    is_disputed: boolean;
    voted_by_consensus: boolean;
    voting_yes?: number | null;
    voting_no?: number | null;
    decided_at: Date;
    decided_by?: string | null;
  } | null;
  akademik: {
    kktp_threshold: number;
    total_mapel: number;
    mapel_tuntas: number;
    mapel_belum_tuntas: number;
    rata_rata_nilai: number;
    mata_pelajaran: Array<{
      mapel_id: string;
      nama_mapel: string;
      kkm: number;
      nilai_akhir: number;
      is_tuntas: boolean;
      deskripsi?: string | null;
    }>;
    ekskul: Array<{
      nama_kegiatan: string;
      predikat: string;
      keterangan?: string | null;
    }>;
  };
  kehadiran: {
    total_hari_efektif: number;
    persentase_kehadiran: number;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    terlambat: number;
  };
  kesiswaan: {
    total_poin_pelanggaran: number;
    pelanggaran: Array<{
      tanggal: Date;
      kategori: string;
      deskripsi: string;
      poin: number;
      sanksi?: string | null;
    }>;
    prestasi: Array<{
      tanggal: Date;
      nama_prestasi: string;
      tingkat: string;
      peringkat: string;
    }>;
  };
  bk: {
    total_kasus: number;
    kasus: Array<{
      tanggal: Date;
      judul: string;
      status: string;
      tindakan_lanjut?: string | null;
    }>;
    home_visit: Array<{
      tanggal: Date;
      tujuan: string;
      hasil?: string | null;
    }>;
  };
}
