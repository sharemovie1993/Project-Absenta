import { z } from 'zod';

export const scoreFieldSchema = z.number().min(0).max(100).nullable();

export const deskripsiTpSchema = z.object({
  mitra_id: z.string().min(1, 'Mitra DUDI wajib dipilih'),
  deskripsi_tp: z.string().min(5, 'Deskripsi minimal 5 karakter'),
});

export const scoreSchema = z.object({
  score: z.number().min(0).max(100).optional(),
});

export interface HubinAssessmentSettings {
  assessmentMode?: 'DUDI_ONLY' | 'DUDI_SIDANG' | 'COMPOSITE';
  weightDudi?: number;
  weightLaporan?: number;
  weightSidang?: number;
}

export interface PklSanggahInfo {
  active?: boolean;
  alasan?: string;
  catatan?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  submitted_by?: string;
  submitted_by_name?: string;
  submitted_at?: string;
  review_note?: string;
}

export interface ScoreRow {
  siswa_pkl_id: string;
  nama_siswa: string;
  nis: string;
  foto?: string | null;
  kelas_id?: string;
  nama_kelas?: string;
  jurusan_id?: string;
  nama_jurusan?: string;
  singkatan_jurusan?: string;
  mitra_nama: string;
  instruktur_nama: string;
  penanggung_jawab_nama: string;
  alamat_dudi: string;
  hard_kompetensi_teknis: number | null;
  hard_sop_k3lh: number | null;
  hard_alur_bisnis: number | null;
  soft_kedisiplinan: number | null;
  soft_kerajinan_inisiatif: number | null;
  soft_kerjasama: number | null;
  soft_kejujuran: number | null;
  soft_tanggung_jawab: number | null;
  nilai_laporan: number | null;
  nilai_sidang: number | null;
  sidang_materi?: number | null;
  sidang_komunikasi?: number | null;
  sidang_portofolio?: number | null;
  sidang_sikap?: number | null;
  penguji_id?: string | null;
  penguji_nama: string;
  penguji_foto?: string | null;
  catatan_sidang: string;
  ttd_siswa?: string | null;
  waktu_ttd_siswa?: string | null;
  file_portofolio?: string | null;
  nilai_akhir_pkl: number | null;
  predikat_pkl: string;
  catatan_pkl: string;
  sakit_pkl: number;
  izin_pkl: number;
  alpa_pkl: number;
  auto_sakit?: number;
  auto_izin?: number;
  auto_alpa?: number;
  auto_hadir?: number;
  nomor_sertifikat: string;
  deskripsi_tp: string;
  status?: string;
  pembimbing_id?: string;
  pembimbing_nama?: string;
  pembimbing_nip?: string;
  pembimbing_foto?: string | null;
  siswa_status?: string | null;
  siswa_alasan_keluar?: string | null;
  pkl_sanggah?: PklSanggahInfo | null;
}

export function isPklRowExempted(row: {
  siswa_status?: string | null;
  siswa_alasan_keluar?: string | null;
  pkl_sanggah?: PklSanggahInfo | null;
}): {
  exempted: boolean;
  reasonLabel: string;
  isAutoMaster: boolean;
  isSanggah: boolean;
  sanggahStatus?: string;
} {
  const st = String(row?.siswa_status || 'AKTIF').trim().toUpperCase();
  if (st && st !== 'AKTIF') {
    return {
      exempted: true,
      reasonLabel: `Status Siswa: ${st}${row.siswa_alasan_keluar ? ` (${row.siswa_alasan_keluar})` : ''}`,
      isAutoMaster: true,
      isSanggah: false,
    };
  }
  const s = row?.pkl_sanggah;
  if (s?.active && s?.status !== 'REJECTED') {
    const labelMap: Record<string, string> = {
      SISWA_KELUAR: 'Siswa Keluar',
      MUTASI_SEKOLAH: 'Mutasi Sekolah',
      DIBATALKAN_DUDI: 'Dibatalkan DUDI',
      TIDAK_HADIR_TOTAL: 'Tidak Pernah Hadir',
      LAINNYA: 'Lainnya',
    };
    return {
      exempted: true,
      reasonLabel: labelMap[s.alasan || ''] || s.alasan || 'Disanggah Guru',
      isAutoMaster: false,
      isSanggah: true,
      sanggahStatus: s.status || 'PENDING',
    };
  }
  return { exempted: false, reasonLabel: '', isAutoMaster: false, isSanggah: false };
}

export interface RawPklItem {
  id?: string;
  siswa_pkl_id?: string;
  pembimbing_nama?: string;
  pembimbing_id?: string;
  pembimbing_foto?: string | null;
  penguji_foto?: string | null;
  Siswa?: { 
    id?: string;
    nama_siswa?: string; 
    nis?: string; 
    nisn?: string;
    foto?: string | null;
    kelas_id?: string;
    Kelas?: { id?: string; nama_kelas?: string };
  };
  SiswaAkademik?: {
    id?: string;
    kelas_id?: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
    kelas?: { id?: string; nama_kelas?: string };
    tahunPelajaran?: { id?: string; tahun?: string };
    semester?: { id?: string; nama_semester?: string };
  };
  Pembimbing?: {
    id?: string;
    nama_guru?: string;
    nip?: string;
    foto?: string | null;
  };
  siswa_nama?: string;
  nis?: string;
  foto?: string | null;
  Mitra?: { nama?: string; alamat?: string };
  mitra_nama?: string;
  instruktur_nama?: string;
  penanggung_jawab_nama?: string;
  alamat_dudi?: string;
  hard_kompetensi_teknis?: number | null;
  hard_sop_k3lh?: number | null;
  hard_alur_bisnis?: number | null;
  soft_kedisiplinan?: number | null;
  soft_kerajinan_inisiatif?: number | null;
  soft_kerjasama?: number | null;
  soft_kejujuran?: number | null;
  soft_tanggung_jawab?: number | null;
  jurnal_json?: {
    file_url?: string;
    status?: string;
  };
  nilai_json?: {
    dudi_avg?: number | null;
    nilai_laporan?: number | null;
    nilai_sidang?: number | null;
    sidang_materi?: number | null;
    sidang_komunikasi?: number | null;
    sidang_portofolio?: number | null;
    sidang_sikap?: number | null;
    penguji_nama?: string | null;
    penguji_id?: string | null;
    catatan_sidang?: string | null;
    tanggal_sidang?: string | null;
    ttd_siswa?: string | null;
    waktu_ttd_siswa?: string | null;
  };
  nilai_akhir_pkl?: number | null;
  predikat_pkl?: string;
  catatan_pkl?: string;
  sakit_pkl?: number;
  izin_pkl?: number;
  alpa_pkl?: number;
  auto_sakit?: number;
  auto_izin?: number;
  auto_alpa?: number;
  auto_hadir?: number;
  nomor_sertifikat?: string;
  deskripsi_tp?: string;
  status?: string;
}

export interface DeskripsiTpItem {
  id: string;
  mitra_id?: string;
  jurusan_id?: string;
  deskripsi_tp: string;
  Mitra?: { nama: string };
  Jurusan?: { id: string; nama: string; singkatan: string };
}

export function isValidScoreNumber(v: unknown): v is number {
  return typeof v === 'number' && v !== null && !Number.isNaN(v) && v > 0;
}

export interface DudiCompletenessResult {
  /** Seluruh 8 komponen nilai DUDI + Nama Pimpinan DUDI + Nama Instruktur Lapangan telah diisi lengkap */
  isComplete: boolean;
  /** Sebagian komponen nilai atau identitas DUDI sudah diisi tetapi belum semuanya lengkap */
  isPartial: boolean;
  /** Seluruh 8 aspek nilai DUDI (3 Hard Skill + 5 Soft Skill) terisi (> 0) */
  all8ScoresFilled: boolean;
  /** Jumlah aspek nilai DUDI yang sudah diisi (0 - 8) */
  filledScoresCount: number;
  /** Nama Pimpinan / Penanggung Jawab DUDI sudah diisi */
  hasPimpinan: boolean;
  /** Nama Instruktur Lapangan sudah diisi */
  hasInstruktur: boolean;
  /** Rata-rata dari komponen nilai DUDI yang sudah diisi */
  avgScore: number | null;
  /** Daftar komponen yang masih kosong */
  missingItems: string[];
}

export function evaluateDudiCompleteness(target: {
  hard_kompetensi_teknis?: number | null;
  hard_sop_k3lh?: number | null;
  hard_alur_bisnis?: number | null;
  soft_kedisiplinan?: number | null;
  soft_kerajinan_inisiatif?: number | null;
  soft_kerjasama?: number | null;
  soft_kejujuran?: number | null;
  soft_tanggung_jawab?: number | null;
  penanggung_jawab_nama?: string | null;
  instruktur_nama?: string | null;
}): DudiCompletenessResult {
  const scoreEntries: Array<{ label: string; val: unknown }> = [
    { label: 'Teknis', val: target.hard_kompetensi_teknis },
    { label: 'K3LH', val: target.hard_sop_k3lh },
    { label: 'Bisnis', val: target.hard_alur_bisnis },
    { label: 'Disiplin', val: target.soft_kedisiplinan },
    { label: 'Inisiatif', val: target.soft_kerajinan_inisiatif },
    { label: 'Kerjasama', val: target.soft_kerjasama },
    { label: 'Kejujuran', val: target.soft_kejujuran },
    { label: 'T.Jawab', val: target.soft_tanggung_jawab },
  ];

  const validScores: number[] = [];
  const missingScoreLabels: string[] = [];

  for (const item of scoreEntries) {
    const num = typeof item.val === 'string' && item.val.trim() !== '' ? Number(item.val) : item.val;
    if (isValidScoreNumber(num)) {
      validScores.push(num);
    } else {
      missingScoreLabels.push(item.label);
    }
  }

  const filledScoresCount = validScores.length;
  const all8ScoresFilled = filledScoresCount === 8;
  const hasPimpinan = typeof target.penanggung_jawab_nama === 'string' && target.penanggung_jawab_nama.trim().length > 0;
  const hasInstruktur = typeof target.instruktur_nama === 'string' && target.instruktur_nama.trim().length > 0;

  const missingItems: string[] = [];
  if (!hasPimpinan) missingItems.push('Nama Pimpinan DUDI');
  if (!hasInstruktur) missingItems.push('Nama Instruktur');
  if (!all8ScoresFilled) {
    if (filledScoresCount === 0) {
      missingItems.push('8 Komponen Nilai DUDI');
    } else {
      missingItems.push(`${8 - filledScoresCount} Komponen Nilai (${missingScoreLabels.join(', ')})`);
    }
  }

  const isComplete = all8ScoresFilled && hasPimpinan && hasInstruktur;
  const isPartial = !isComplete && (filledScoresCount > 0 || hasPimpinan || hasInstruktur);
  const avgScore =
    filledScoresCount > 0
      ? Number((validScores.reduce((a, b) => a + b, 0) / filledScoresCount).toFixed(1))
      : null;

  return {
    isComplete,
    isPartial,
    all8ScoresFilled,
    filledScoresCount,
    hasPimpinan,
    hasInstruktur,
    avgScore,
    missingItems,
  };
}

export interface SidangCompletenessResult {
  /** Seluruh 4 komponen nilai Sidang (Laporan/Portofolio, Materi, Komunikasi, Sikap) telah diisi lengkap */
  isComplete: boolean;
  /** Sebagian komponen nilai Sidang sudah diisi tetapi belum lengkap 4 aspek */
  isPartial: boolean;
  /** Jumlah aspek nilai Sidang yang sudah diisi (0 - 4) */
  filledAspectsCount: number;
  /** Nilai akhir sidang terbobot dari komponen yang valid */
  computedScore: number | null;
  /** Daftar aspek sidang yang masih kosong */
  missingItems: string[];
}

export function evaluateSidangCompleteness(target: {
  sidang_materi?: number | null;
  sidang_komunikasi?: number | null;
  sidang_portofolio?: number | null;
  sidang_sikap?: number | null;
  nilai_sidang?: number | null;
}): SidangCompletenessResult {
  const aspectEntries: Array<{ label: string; val: unknown; weight: number }> = [
    { label: 'Laporan/Portofolio', val: target.sidang_portofolio, weight: 20 },
    { label: 'Penguasaan Materi', val: target.sidang_materi, weight: 40 },
    { label: 'Tanya Jawab/Komunikasi', val: target.sidang_komunikasi, weight: 25 },
    { label: 'Sikap & Etika', val: target.sidang_sikap, weight: 15 },
  ];

  let filledAspectsCount = 0;
  let totalWeighted = 0;
  let totalWeight = 0;
  const missingItems: string[] = [];

  for (const item of aspectEntries) {
    const num = typeof item.val === 'string' && item.val.trim() !== '' ? Number(item.val) : item.val;
    if (isValidScoreNumber(num)) {
      filledAspectsCount += 1;
      totalWeighted += num * item.weight;
      totalWeight += item.weight;
    } else {
      missingItems.push(item.label);
    }
  }

  const isComplete = filledAspectsCount === 4;
  const isPartial = !isComplete && filledAspectsCount > 0;
  const computedScore =
    totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 10) / 10 : null;

  return {
    isComplete,
    isPartial,
    filledAspectsCount,
    computedScore,
    missingItems,
  };
}

export function calculateNilaiSidangFromAspects(target: {
  sidang_materi?: number | null;
  sidang_komunikasi?: number | null;
  sidang_portofolio?: number | null;
  sidang_sikap?: number | null;
}): number | null {
  return evaluateSidangCompleteness(target).computedScore;
}

export function calculateNilaiAkhirPkl(
  target: Partial<ScoreRow>,
  settings?: HubinAssessmentSettings
): { nilai_akhir_pkl: number | null; predikat_pkl: string } {
  const dudiEval = evaluateDudiCompleteness(target);
  const dudiAvg = dudiEval.avgScore;
  const sidangEval = evaluateSidangCompleteness(target);
  const sidangScore = sidangEval.computedScore;

  const mode = settings?.assessmentMode || 'DUDI_ONLY';
  const isComposite = mode === 'COMPOSITE';
  const isDudiSidang = mode === 'DUDI_SIDANG';
  const wDudi = settings?.weightDudi ?? 70;
  const wLaporan = settings?.weightLaporan ?? 15;
  const wSidang = settings?.weightSidang ?? (isDudiSidang ? 30 : 15);

  let nilai_akhir: number | null = null;

  if (isComposite) {
    let totalScore = 0;
    let totalWeight = 0;
    if (dudiAvg !== null) {
      totalScore += dudiAvg * wDudi;
      totalWeight += wDudi;
    }
    if (isValidScoreNumber(target.nilai_laporan)) {
      totalScore += Number(target.nilai_laporan) * wLaporan;
      totalWeight += wLaporan;
    }
    if (sidangScore !== null) {
      totalScore += sidangScore * wSidang;
      totalWeight += wSidang;
    }
    nilai_akhir = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : null;
  } else if (isDudiSidang) {
    let totalScore = 0;
    let totalWeight = 0;
    if (dudiAvg !== null) {
      totalScore += dudiAvg * wDudi;
      totalWeight += wDudi;
    }
    if (sidangScore !== null) {
      totalScore += sidangScore * wSidang;
      totalWeight += wSidang;
    }
    nilai_akhir = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : null;
  } else {
    nilai_akhir = dudiAvg !== null ? Math.round(dudiAvg * 10) / 10 : null;
  }

  let predikat = '-';
  if (nilai_akhir !== null) {
    if (nilai_akhir >= 90) predikat = 'Amat Baik';
    else if (nilai_akhir >= 80) predikat = 'Baik';
    else if (nilai_akhir >= 70) predikat = 'Cukup';
    else predikat = 'Kurang';
  }

  return { nilai_akhir_pkl: nilai_akhir, predikat_pkl: predikat };
}
