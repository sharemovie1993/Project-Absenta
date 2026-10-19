import { requestWithFallback } from '../apiUtils';

export type PlenoStatus = 'DRAFT' | 'PRE_TRIAGE' | 'IN_PROGRESS' | 'FINALIZED' | 'CANCELLED';
export type DecisionType =
  | 'NAIK'
  | 'NAIK_BERSYARAT'
  | 'TINGGAL_KELAS'
  | 'LULUS'
  | 'TIDAK_LULUS'
  | 'MUTASI'
  | 'KELUAR'
  | 'MENINGGAL';
export type TriageZone = 'GREEN' | 'YELLOW' | 'RED';

export interface PlenoSession {
  id: string;
  tenant_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  title: string;
  nomor_bap?: string | null;
  date: string;
  start_time: string;
  end_time?: string | null;
  location: string;
  description?: string | null;
  total_eligible_voters: number;
  quorum_target: number;
  status: PlenoStatus;
  leader_user_id?: string | null;
  secretary_user_id?: string | null;
  closing_notes?: string | null;
  finalized_at?: string | null;
  TahunPelajaran?: { id: string; tahun: string };
  Semester?: { id: string; semester: string };
  _count?: {
    attendances: number;
    rombels: number;
    decisions: number;
    minutes: number;
  };
  leader?: { id: string; nama_lengkap: string; nip?: string } | null;
  secretary?: { id: string; nama_lengkap: string; nip?: string } | null;
  present_count?: number;
  is_quorum_reached?: boolean;
}

export interface PlenoAttendance {
  id: string;
  session_id: string;
  user_id: string;
  role_in_meeting: string;
  is_present: boolean;
  attended_at?: string | null;
  signature_url?: string | null;
  notes?: string | null;
  User?: {
    id: string;
    nama_lengkap: string;
    nip?: string | null;
    email: string;
    role: string;
  };
}

export interface PlenoRombel {
  id: string;
  session_id: string;
  kelas_id: string;
  wali_kelas_user_id?: string | null;
  status: string;
  total_students: number;
  green_count: number;
  yellow_count: number;
  red_count: number;
  mutasi_count?: number;
  reviewed_at?: string | null;
  notes?: string | null;
  Kelas: {
    id: string;
    nama_kelas: string;
    tingkat: number;
    wali_kelas_id?: string | null;
  };
  wali_kelas?: {
    id: string;
    nama_lengkap: string;
    nip?: string | null;
  } | null;
}

export interface PlenoCandidate {
  id: string;
  session_id: string;
  rombel_id: string;
  siswa_id: string;
  triage_zone: TriageZone;
  triage_reasons?: string | null;
  is_hanging_status?: boolean;
  rekomendasi_awal: DecisionType;
  keputusan_akhir: DecisionType;
  target_kelas_id?: string | null;
  alasan_keputusan?: string | null;
  catatan_pendampingan?: string | null;
  mutasi_sekolah_tujuan?: string | null;
  mutasi_no_surat?: string | null;
  mutasi_tanggal?: string | null;
  is_disputed: boolean;
  voted_by_consensus: boolean;
  voting_yes?: number | null;
  voting_no?: number | null;
  decided_at: string;
  Siswa: {
    id: string;
    nis: string;
    nama_lengkap: string;
    jenis_kelamin: string;
    foto?: string | null;
  };
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
    zone: TriageZone;
    reasons: string[];
    rekomendasi_awal: DecisionType;
  };
  decision?: {
    id: string;
    keputusan_akhir: DecisionType;
    target_kelas_id?: string | null;
    alasan_keputusan?: string | null;
    catatan_pendampingan?: string | null;
    is_disputed: boolean;
    voted_by_consensus: boolean;
    voting_yes?: number | null;
    voting_no?: number | null;
    decided_at: string;
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
      tanggal: string;
      kategori: string;
      deskripsi: string;
      poin: number;
      sanksi?: string | null;
    }>;
    prestasi: Array<{
      tanggal: string;
      nama_prestasi: string;
      tingkat: string;
      peringkat: string;
    }>;
  };
  bk: {
    total_kasus: number;
    kasus: Array<{
      tanggal: string;
      judul: string;
      status: string;
      tindakan_lanjut?: string | null;
    }>;
    home_visit: Array<{
      tanggal: string;
      tujuan: string;
      hasil?: string | null;
    }>;
  };
}

export interface PlenoMinute {
  id: string;
  session_id: string;
  rombel_id?: string | null;
  author_id: string;
  speaker_name?: string | null;
  speaker_role?: string | null;
  topic: string;
  content: string;
  action_item?: string | null;
  created_at: string;
}

export interface CreateSessionInput {
  tahun_pelajaran_id: string;
  semester_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time?: string;
  location: string;
  description?: string;
  quorum_target?: number;
  leader_user_id?: string;
  secretary_user_id?: string;
}

export interface DecideStudentInput {
  keputusan_akhir: DecisionType;
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

export interface CreateMinuteInput {
  rombel_id?: string;
  speaker_name?: string;
  speaker_role?: string;
  topic: string;
  content: string;
  action_item?: string;
}

// ═══════════════════════════════════════════════════════════════════
// API CLIENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

export const listPlenoSessions = async (params?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  status?: string;
}) => {
  return requestWithFallback<{ success: boolean; data: PlenoSession[] }>(
    'get',
    '/academic/pleno/sessions',
    { params }
  );
};

export const createPlenoSession = async (payload: CreateSessionInput) => {
  return requestWithFallback<{ success: boolean; data: PlenoSession }>(
    'post',
    '/academic/pleno/sessions',
    { data: payload }
  );
};

export const getPlenoSessionDetail = async (id: string) => {
  return requestWithFallback<{ success: boolean; data: PlenoSession }>(
    'get',
    `/academic/pleno/sessions/${id}`
  );
};

export const updatePlenoSession = async (id: string, payload: Partial<CreateSessionInput>) => {
  return requestWithFallback<{ success: boolean; data: PlenoSession }>(
    'patch',
    `/academic/pleno/sessions/${id}`,
    { data: payload }
  );
};

export const startPlenoSession = async (id: string) => {
  return requestWithFallback<{ success: boolean; data: PlenoSession }>(
    'post',
    `/academic/pleno/sessions/${id}/start`
  );
};

export const pausePlenoSession = async (id: string) => {
  return requestWithFallback<{ success: boolean; data: PlenoSession }>(
    'post',
    `/academic/pleno/sessions/${id}/pause`
  );
};

export const finalizePlenoSession = async (id: string, closingNotes?: string) => {
  return requestWithFallback<{ success: boolean; data: PlenoSession }>(
    'post',
    `/academic/pleno/sessions/${id}/finalize`,
    { data: { closing_notes: closingNotes } }
  );
};

export const listPlenoAttendance = async (id: string) => {
  return requestWithFallback<{ success: boolean; data: PlenoAttendance[] }>(
    'get',
    `/academic/pleno/sessions/${id}/attendance`
  );
};

export const tapPlenoAttendance = async (
  id: string,
  payload: { user_id?: string; is_present?: boolean; role_in_meeting?: string; notes?: string }
) => {
  return requestWithFallback<{ success: boolean; data: PlenoAttendance }>(
    'post',
    `/academic/pleno/sessions/${id}/attendance/tap`,
    { data: payload }
  );
};

export const bulkInvitePlenoAttendance = async (id: string) => {
  return requestWithFallback<{ success: boolean; data: { total_teachers: number; added: number } }>(
    'post',
    `/academic/pleno/sessions/${id}/attendance/bulk-invite`
  );
};

export const listPlenoRombels = async (id: string) => {
  return requestWithFallback<{ success: boolean; data: PlenoRombel[] }>(
    'get',
    `/academic/pleno/sessions/${id}/rombels`
  );
};

export const calculatePlenoTriage = async (id: string, rombelId?: string) => {
  return requestWithFallback<{ success: boolean; data: PlenoRombel[] }>(
    'post',
    `/academic/pleno/sessions/${id}/rombels/calculate-triage`,
    { data: { rombel_id: rombelId } }
  );
};

export const getPlenoRombelCandidates = async (id: string, rombelId: string) => {
  return requestWithFallback<{ success: boolean; data: { rombel: PlenoRombel; candidates: PlenoCandidate[] } }>(
    'get',
    `/academic/pleno/sessions/${id}/rombels/${rombelId}/candidates`
  );
};

export const batchApproveGreenCandidates = async (id: string, rombelId: string) => {
  return requestWithFallback<{ success: boolean; data: { success: boolean; approved_count: number } }>(
    'post',
    `/academic/pleno/sessions/${id}/rombels/${rombelId}/batch-approve-green`
  );
};

export const getStudentDossier360 = async (id: string, siswaId: string) => {
  return requestWithFallback<{ success: boolean; data: StudentDossier360 }>(
    'get',
    `/academic/pleno/sessions/${id}/students/${siswaId}/dossier`
  );
};

export const decideStudentCandidate = async (
  id: string,
  siswaId: string,
  payload: DecideStudentInput
) => {
  return requestWithFallback<{ success: boolean; data: any }>(
    'post',
    `/academic/pleno/sessions/${id}/students/${siswaId}/decide`,
    { data: payload }
  );
};

export const listPlenoMinutes = async (id: string) => {
  return requestWithFallback<{ success: boolean; data: PlenoMinute[] }>(
    'get',
    `/academic/pleno/sessions/${id}/minutes`
  );
};

export const createPlenoMinute = async (id: string, payload: CreateMinuteInput) => {
  return requestWithFallback<{ success: boolean; data: PlenoMinute }>(
    'post',
    `/academic/pleno/sessions/${id}/minutes`,
    { data: payload }
  );
};

export const syncPlenoToTransition = async (id: string, targetTahunPelajaranId: string) => {
  return requestWithFallback<{
    success: boolean;
    data: { promoted_count: number; conditional_count: number; retained_count: number };
  }>('post', `/academic/pleno/sessions/${id}/sync-to-transition`, {
    data: { target_tahun_pelajaran_id: targetTahunPelajaranId },
  });
};

export const exportPlenoBap = async (id: string) => {
  return requestWithFallback<{ success: boolean; data: any }>(
    'get',
    `/academic/pleno/sessions/${id}/export-bap`
  );
};
